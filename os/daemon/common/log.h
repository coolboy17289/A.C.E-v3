/*
 * A.C.E OS — Thread-safe leveled logger.
 *
 * Writes a single line per call to stderr in the form:
 *
 *     <RFC3339 UTC timestamp> [LEVEL] [tag] <message>
 *
 * Lines are serialised under a single mutex so concurrent daemons (or
 * the request-handling thread in this single-process server) do not
 * interleave output. The implementation avoids malloc, so the formatter
 * is safe to call from contexts where the allocator is not available.
 *
 * Use ace_log_set_level() to drop noise. Default level: INFO.
 *
 * This is intentionally small. We are not pulling in syslog, log4c, or
 * anything else; the daemons need ~6 log lines per minute at most.
 */

#ifndef ACE_LOG_H
#define ACE_LOG_H

#include <stdarg.h>

#ifdef __cplusplus
extern "C" {
#endif

typedef enum {
    ACE_LOG_DEBUG = 0,
    ACE_LOG_INFO  = 1,
    ACE_LOG_WARN  = 2,
    ACE_LOG_ERROR = 3
} ace_log_level_t;

/* Set the minimum level that will be emitted. Messages with a level
 * below `min` are dropped. Safe to call at any time, including from
 * library constructors. */
void ace_log_set_level(ace_log_level_t min);

/* Emit a log line. `tag` is a short identifier ("http", "daemon", ...);
 * `fmt` is a printf-style format string. */
void ace_log(ace_log_level_t level, const char *tag, const char *fmt, ...)
    __attribute__((format(printf, 3, 4)));

/* va_list form. Forwards to ace_log() after consuming `ap`. */
void ace_logv(ace_log_level_t level, const char *tag, const char *fmt, va_list ap)
    __attribute__((format(printf, 3, 0)));

#ifdef __cplusplus
}
#endif

#endif /* ACE_LOG_H */