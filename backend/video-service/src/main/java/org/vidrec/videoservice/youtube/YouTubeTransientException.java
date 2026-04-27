package org.vidrec.videoservice.youtube;

public class YouTubeTransientException extends YouTubeApiException {

    public YouTubeTransientException(int statusCode, String message, Throwable cause) {
        super(statusCode, false, message, cause);
    }
}
