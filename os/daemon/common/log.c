/*
 * A.C.E OS — Thread-safe leveled logger (implementation). See log.h.
 */

#include "log.h"

#include <pthread.h>
#include <stdarg.h>
#include <stdio.h>
#include <string.h>
#include <time.h>

/* Default level. Reads outside the lock are benign — worst case a single
 * log line slips through the filter, which is acceptable for a logger. */
static ace_log_level_t g_min_level = ACE_LOG_INFO;
static pthread_mutex_t g_lock      = PTHREAD_MUTEX_INITIALIZER;

void ace_log_set_level(ace_log_level_t min)
{
    g_min_level = min;
}

static const char *level_name(ace_log_level_t l)
{
    switch (l) {
        case ACE_LOG_DEBUG: return "DEBUG";
        case ACE_LOG_INFO:  return "INFO";
        case ACE_LOG_WARN:  return "WARN";
        case ACE_LOG_ERROR: return "ERROR";
    }
    return "?";
}

/* Render the current wall-clock time as an RFC3339 / ISO-8601 string
 * with millisecond precision. The buffer must be at least 32 bytes. */
static void format_timestamp(char *buf, size_t buflen)
{
    struct timespec ts;
    clock_gettime(CLOCK_REALTIME, &ts);
    struct tm tm;
    gmtime_r(&ts.tv_sec, &tm);
    /* Clamp each field so the compiler can prove the snprintf output
     * fits — this silences -Wformat-truncation. The values from gmtime_r
     * are already in these ranges, the explicit clamps are defensive. */
    int year  = (tm.tm_year + 1900 < 0)   ? 0   : tm.tm_year + 1900;
    int mon   = (tm.tm_mon  < 0  || tm.tm_mon  > 99) ? 1  : tm.tm_mon + 1;
    int mday  = (tm.tm_mday < 0  || tm.tm_mday > 99) ? 1  : tm.tm_mday;
    int hour  = (tm.tm_hour < 0  || tm.tm_hour > 99) ? 0  : tm.tm_hour;
    int min   = (tm.tm_min  < 0  || tm.tm_min  > 99) ? 0  : tm.tm_min;
    int sec   = (tm.tm_sec  < 0  || tm.tm_sec  > 99) ? 0  : tm.tm_sec;
    long ms   = ts.tv_nsec / 1000000L;
    if (ms < 0)   ms = 0;
    if (ms > 999) ms = 999;
    snprintf(buf, buflen,
             "%04d-%02d-%02dT%02d:%02d:%02d.%03ldZ",
             year, mon, mday, hour, min, sec, ms);
}

void ace_logv(ace_log_level_t level, const char *tag, const char *fmt, va_list ap)
{
    if (level < g_min_level) return;

    char timebuf[40];
    format_timestamp(timebuf, sizeof(timebuf));

    pthread_mutex_lock(&g_lock);
    fputs(timebuf, stderr);
    fputc(' ', stderr);
    fputs(level_name(level), stderr);
    fputs(" [", stderr);
    fputs(tag ? tag : "aced", stderr);
    fputs("] ", stderr);
    /* Caller's ap is consumed; we hold the lock for the full write so
     * that no other thread can interleave inside this vfprintf. */
    vfprintf(stderr, fmt, ap);
    fputc('\n', stderr);
    fflush(stderr);
    pthread_mutex_unlock(&g_lock);
}

void ace_log(ace_log_level_t level, const char *tag, const char *fmt, ...)
{
    va_list ap;
    va_start(ap, fmt);
    ace_logv(level, tag, fmt, ap);
    va_end(ap);
}