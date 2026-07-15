// A.C.E OS · C++ / Qt 6 (Widgets) front-end MVP.
//
// Why widgets (not QML): minimum-viable dependency surface — only Qt
// Core / Gui / Widgets / Network. QML adds Quick, Qml, and a QML
// compiler to the runtime; for an MVP card with three rows and a
// button that's pure overhead.
//
// QNetworkAccessManager handles networking asynchronously, integrated
// with Qt's event loop, so the UI thread is never blocked. The
// `finished` lambdas touch QLabel/QPushButton directly because Qt
// routes them back onto the UI thread internally (via queued
// connections, since `connect` defaults to AutoConnection).
//
// Backend base resolution order (matches the other shells):
//   1. ACE_BACKEND env var, e.g. http://192.0.2.10:4318
//   2. ACE_PORT    env var, e.g. 4318  -> http://127.0.0.1:4318
//   3. default:                     -> http://127.0.0.1:4318

#include <QApplication>
#include <QDateTime>
#include <QFontDatabase>
#include <QLabel>
#include <QMainWindow>
#include <QNetworkAccessManager>
#include <QNetworkReply>
#include <QNetworkRequest>
#include <QPushButton>
#include <QUrl>
#include <QVBoxLayout>
#include <QWidget>

#include <QJsonDocument>
#include <QJsonObject>

#include <cstdlib>
#include <string>

namespace {

QString resolveBackendBase() {
    const QByteArray envBackend = qgetenv("ACE_BACKEND");
    if (!envBackend.isEmpty()) {
        QString s = QString::fromLocal8Bit(envBackend);
        while (s.endsWith('/')) s.chop(1);
        return s;
    }
    const QByteArray envPort = qgetenv("ACE_PORT");
    if (!envPort.isEmpty()) {
        return QStringLiteral("http://127.0.0.1:") + QString::fromLocal8Bit(envPort);
    }
    return QStringLiteral("http://127.0.0.1:4318");
}

class AceWindow : public QMainWindow {
    Q_OBJECT
public:
    explicit AceWindow(QWidget *parent = nullptr) : QMainWindow(parent) {
        setWindowTitle("A.C.E OS  -  Qt");
        resize(640, 360);

        auto *central = new QWidget(this);
        setCentralWidget(central);

        auto *layout = new QVBoxLayout(central);
        layout->setContentsMargins(28, 28, 28, 28);
        layout->setSpacing(10);

        auto *title = new QLabel("A.C.E OS");
        title->setStyleSheet("font-size: 28px; font-weight: 600; color: #e8eaf3;");
        layout->addWidget(title);

        auto *sub = new QLabel("C++ / Qt 6 shell  -  v0.1.0");
        sub->setStyleSheet("color: #94a3b8; font-size: 12px;");
        layout->addWidget(sub);

        m_backend = new QLabel("Backend: -");
        m_backend->setStyleSheet("font-size: 14px; color: #e8eaf3;");
        layout->addWidget(m_backend);

        m_user = new QLabel("User: -");
        m_user->setStyleSheet("font-size: 14px; color: #60a5fa; font-weight: 600;");
        layout->addWidget(m_user);

        m_fetched = new QLabel("Last fetched: never");
        m_fetched->setStyleSheet("font-size: 12px; color: #94a3b8;");
        layout->addWidget(m_fetched);

        m_error = new QLabel("");
        m_error->setStyleSheet("color: #fca5a5; font-size: 12px;");
        layout->addWidget(m_error);

        m_refresh = new QPushButton("Refresh");
        m_refresh->setFixedHeight(38);
        m_refresh->setStyleSheet(
            "QPushButton {"
            " background: qlineargradient(x1:0, y1:0, x2:1, y2:0,"
            "   stop:0 #60a5fa, stop:1 #a78bfa);"
            " color: white; border: none; border-radius: 10px;"
            " font-weight: 600; padding: 0 22px;"
            "}"
            "QPushButton:disabled { background: #475569; }"
        );
        layout->addWidget(m_refresh, 0, Qt::AlignLeft);

        setStyleSheet(
            "QMainWindow { background: qlineargradient(x1:0, y1:0, x2:1, y2:1,"
            "   stop:0 #1f2a44, stop:1 #0b1020); }"
        );

        connect(m_refresh, &QPushButton::clicked, this, &AceWindow::refresh);
        // Kick off the first fetch after the window is shown so
        // socket events have an event loop to land on.
        QMetaObject::invokeMethod(this, &AceWindow::refresh,
                                  Qt::QueuedConnection);
    }

private slots:
    void refresh() {
        m_pending = 2;
        m_refresh->setEnabled(false);
        m_refresh->setText("Refreshing...");
        m_error->setText("");

        QNetworkRequest hReq(QUrl(m_backendBase + "/api/health"));
        QNetworkReply *h = m_nam.get(hReq);
        connect(h, &QNetworkReply::finished, this, [this, h]() { onHealth(h); });

        QNetworkRequest uReq(QUrl(m_backendBase + "/api/users/me"));
        QNetworkReply *u = m_nam.get(uReq);
        connect(u, &QNetworkReply::finished, this, [this, u]() { onUser(u); });
    }

private:
    void onHealth(QNetworkReply *r) {
        consume(r, /*kind=*/"backend");
    }

    void onUser(QNetworkReply *r) {
        consume(r, /*kind=*/"user");
    }

    void consume(QNetworkReply *r, const char *kind) {
        const auto body = r->readAll();
        const QNetworkReply::NetworkError netErr = r->error();
        const int httpStatus =
            (netErr == QNetworkReply::NoError) ? r->attribute(
                QNetworkRequest::HttpStatusCodeAttribute).toInt() : 0;
        r->deleteLater();

        bool ok = false;
        // Network-level failure (DNS, connect refused, timeout) takes
        // priority over a parse error: the user wants to know the
        // backend is unreachable, not that "an empty body isn't JSON".
        if (netErr != QNetworkReply::NoError) {
            m_error->setText(QStringLiteral("Error (%1): %2")
                .arg(kind, r->errorString()));
        } else if (httpStatus >= 400) {
            m_error->setText(QStringLiteral("HTTP %1 from %2")
                .arg(httpStatus).arg(kind));
        } else {
            QJsonParseError pe;
            const auto doc = QJsonDocument::fromJson(body, &pe);
            if (pe.error == QJsonParseError::NoError && doc.isObject()) {
                const auto obj = doc.object();
                if (qstrcmp(kind, "backend") == 0) {
                    const auto svc = obj.value("service").toString("ace-backend");
                    const bool healthy = obj.value("ok").toBool(false);
                    m_backend->setText(QStringLiteral("Backend: %1 (%2)").arg(svc, healthy ? "ok" : "down"));
                    ok = true;
                } else if (qstrcmp(kind, "user") == 0) {
                    const auto name = obj.value("name").toString("(unnamed)");
                    m_user->setText(QStringLiteral("User: %1").arg(name));
                    ok = true;
                }
            } else {
                m_error->setText(QStringLiteral("Error parsing %1: %2").arg(kind, pe.errorString()));
            }
        }

        if (ok) m_hasEverSucceeded = true;
        else if (!m_hasEverSucceeded) {
            // Backend not yet reachable in the lifetime of the app —
            // mirror the wording used by the other shells.
            if (qstrcmp(kind, "backend") == 0) m_backend->setText("Backend: offline");
            if (qstrcmp(kind, "user") == 0)    m_user->setText("User: offline");
        }

        if (--m_pending <= 0) {
            // Only stamp the timestamp once both calls have settled.
            m_fetched->setText(QStringLiteral("Last fetched: %1")
                .arg(QDateTime::currentDateTime().toString("HH:mm:ss")));
            m_refresh->setEnabled(true);
            m_refresh->setText("Refresh");
        }
    }

    const QString m_backendBase = resolveBackendBase();
    QNetworkAccessManager m_nam;
    QLabel *m_backend{nullptr};
    QLabel *m_user{nullptr};
    QLabel *m_fetched{nullptr};
    QLabel *m_error{nullptr};
    QPushButton *m_refresh{nullptr};
    int m_pending{0};
    bool m_hasEverSucceeded{false};
};
}  // namespace

int main(int argc, char *argv[]) {
    QApplication app(argc, argv);
    AceWindow w;
    w.show();
    return app.exec();
}

#include "main.moc"
