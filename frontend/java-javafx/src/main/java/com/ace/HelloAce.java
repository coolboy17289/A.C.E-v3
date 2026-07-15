package com.ace;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import javafx.application.Application;
import javafx.application.Platform;
import javafx.geometry.Insets;
import javafx.scene.Scene;
import javafx.scene.control.Button;
import javafx.scene.control.Label;
import javafx.scene.layout.VBox;
import javafx.stage.Stage;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * A.C.E OS · Java + JavaFX (JDK 17) front-end MVP.
 *
 * Open a 640×400 window containing three data rows + a Refresh button:
 *   * Backend:     GET /api/health
 *   * User:        GET /api/users/me
 *   * Last fetched: timestamp updated on every successful refresh
 *
 * Both {@code /api/health} and {@code /api/users/me} are queried
 * through {@link HttpClient#sendAsync} so the JavaFX Application
 * Thread is never blocked; results are routed back via
 * {@link Platform#runLater(Runnable)}.
 *
 * <p>Notable design choices:</p>
 * <ul>
 *   <li>The backend base URL is read from the {@code ACE_BACKEND}
 *       environment variable first, then {@code ACE_PORT}, then
 *       {@code http://127.0.0.1:4318}. Mirrors the convention used
 *       by {@code scripts/verify-shells.mjs} so the same shell launch
 *       recipe works against the LAN box, the dev workstation, and a
 *       stopped backend.</li>
 *   <li>If both calls fail (backend offline) the rows fall back to
 *       {@code Backend: offline} and {@code User: offline} so the user
 *       gets a clear signal — not just a row of dashes.</li>
 *   <li>We do not share types with {@code @ace/shared} — the back-end
 *       contract is small enough to hand-map two fields (health.ok,
 *       user.name). Each new shell does the same.</li>
 *   <li>{@code Platform.runLater} is the only thread-safe way to
 *       touch JavaFX scene-graph nodes. Calling from the HTTP
 *       completion thread directly throws
 *       {@code IllegalStateException}.</li>
 *   <li>The {@link AtomicInteger} tracks outstanding HTTP futures so
 *       the Refresh button re-enables only after BOTH calls have
 *       settled — even if one of them errored.</li>
 * </ul>
 */
public class HelloAce extends Application {

    private static final String BACKEND_BASE = resolveBackendBase();
    private static final DateTimeFormatter TIME_FMT =
            DateTimeFormatter.ofPattern("HH:mm:ss");
    private static final ObjectMapper JSON = new ObjectMapper();

    private static String resolveBackendBase() {
        String env = System.getenv("ACE_BACKEND");
        if (env != null && !env.isBlank()) return stripTrailingSlash(env);
        String port = System.getenv("ACE_PORT");
        if (port != null && !port.isBlank()) return "http://127.0.0.1:" + port;
        return "http://127.0.0.1:4318";
    }

    private static String stripTrailingSlash(String s) {
        return s.endsWith("/") ? s.substring(0, s.length() - 1) : s;
    }

    private final HttpClient http = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(3))
            .build();

    private Label backendLbl;
    private Label userLbl;
    private Label fetchedLbl;
    private Label errorLbl;
    private Button refreshBtn;
    private final AtomicInteger pending = new AtomicInteger(0);
    private volatile boolean hasEverSucceeded = false;

    @Override
    public void start(Stage stage) {
        stage.setTitle("A.C.E OS - JavaFX");

        VBox root = new VBox(10);
        root.setPadding(new Insets(28));

        Label title = styled("A.C.E OS", 26, "#e8eaf3", true);
        Label subtitle = styled("Java + JavaFX shell  -  v0.1.0", 11, "#94a3b8", false);

        backendLbl = styled("Backend: -", 14, "#e8eaf3", false);
        userLbl    = styled("User: -", 14, "#60a5fa", true);
        fetchedLbl = styled("Last fetched: never", 12, "#94a3b8", false);
        errorLbl   = styled("", 12, "#fca5a5", false);

        refreshBtn = new Button("Refresh");
        refreshBtn.setMinHeight(34);
        refreshBtn.setStyle(
                "-fx-background-color: linear-gradient(to right, #60a5fa, #a78bfa);"
                + "-fx-text-fill: white;"
                + "-fx-font-weight: bold;"
                + "-fx-background-radius: 8;"
        );
        refreshBtn.setOnAction(e -> refresh());

        root.getChildren().addAll(
                title, subtitle, backendLbl, userLbl, fetchedLbl, errorLbl, refreshBtn);

        Scene scene = new Scene(root, 640, 360);
        scene.setFill(javafx.scene.paint.Color.web("#0b1020"));
        stage.setScene(scene);

        // Initial fetch happens once the event loop is alive.
        Platform.runLater(this::refresh);
        stage.show();
    }

    private void refresh() {
        // Re-entrancy guard. If a fetch is in flight the user has
        // already clicked — ignore subsequent presses until both
        // pending calls settle. `isDisabled()` is the canonical
        // JavaFX accessor; the *setter* is still `setDisable(boolean)`.
        if (refreshBtn.isDisabled()) return;
        errorLbl.setText("");
        refreshBtn.setDisable(true);
        refreshBtn.setText("Refreshing...");
        // Two outstanding calls. Both must settle before the button
        // is re-enabled — handled by `doneOne()`.
        pending.set(2);
        fetchAsync("/api/health", "health");
        fetchAsync("/api/users/me", "user");
    }

    private void fetchAsync(String path, String kind) {
        HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(BACKEND_BASE + path))
                .timeout(Duration.ofSeconds(3))
                .GET()
                .build();

        http.sendAsync(req, HttpResponse.BodyHandlers.ofString())
                .whenComplete((resp, err) -> Platform.runLater(() -> {
                    try {
                        if (err != null) throw new RuntimeException(err);
                        if (resp.statusCode() >= 400) {
                            throw new RuntimeException("HTTP " + resp.statusCode());
                        }
                        JsonNode body = JSON.readTree(resp.body());
                        if ("health".equals(kind)) applyHealth(body);
                        else                        applyUser(body);
                        hasEverSucceeded = true;
                    } catch (Exception ex) {
                        errorLbl.setText("Error (" + kind + "): " + ex.getMessage());
                        // If we never got a successful response in the
                        // lifetime of the app, surface the "offline"
                        // marker in the value row too — matches the
                        // wording used by the other shells.
                        if (!hasEverSucceeded) {
                            if ("health".equals(kind)) backendLbl.setText("Backend: offline");
                            if ("user".equals(kind))   userLbl.setText("User: offline");
                        }
                    } finally {
                        doneOne();
                    }
                }));
    }

    private void applyHealth(JsonNode body) {
        String svc = body.path("service").asText("ace-backend");
        boolean ok = body.path("ok").asBoolean(false);
        backendLbl.setText("Backend: " + svc + " (" + (ok ? "ok" : "down") + ")");
    }

    private void applyUser(JsonNode body) {
        String name = body.path("name").asText("(unnamed)");
        userLbl.setText("User: " + name);
    }

    private void doneOne() {
        if (pending.decrementAndGet() <= 0) {
            // Only stamp the timestamp once both calls have settled —
            // a half-finished refresh that updates only one row is
            // misleading.
            fetchedLbl.setText("Last fetched: " + LocalTime.now().format(TIME_FMT));
            refreshBtn.setDisable(false);
            refreshBtn.setText("Refresh");
        }
    }

    private static Label styled(String text, int sizePx, String color, boolean bold) {
        Label l = new Label(text);
        l.setStyle(String.format(
                "-fx-font-size: %dpx; -fx-text-fill: %s;%s",
                sizePx, color, bold ? " -fx-font-weight: bold;" : ""));
        return l;
    }

    public static void main(String[] args) {
        launch(args);
    }
}
