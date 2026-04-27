package org.vidrec.videoservice.youtube;

public class YouTubeApiException extends RuntimeException {

    private final boolean quotaExceeded;
    private final int statusCode;

    public YouTubeApiException(int statusCode, boolean quotaExceeded, String message) {
        super(message);
        this.statusCode = statusCode;
        this.quotaExceeded = quotaExceeded;
    }

    public YouTubeApiException(int statusCode, boolean quotaExceeded, String message, Throwable cause) {
        super(message, cause);
        this.statusCode = statusCode;
        this.quotaExceeded = quotaExceeded;
    }

    public boolean isQuotaExceeded() {
        return quotaExceeded;
    }

    public int getStatusCode() {
        return statusCode;
    }
}
