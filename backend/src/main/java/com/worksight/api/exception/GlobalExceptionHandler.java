package com.worksight.api.exception;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    // ── 기존 예외 ─────────────────────────────────────────────────

    @ExceptionHandler(DuplicateUsernameException.class)
    public ResponseEntity<Map<String, Object>> handleDuplicateUsername(DuplicateUsernameException e) {
        return error(HttpStatus.CONFLICT, "DUPLICATE_USERNAME", e.getMessage());
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalArgument(IllegalArgumentException e) {
        return error(HttpStatus.BAD_REQUEST, "INVALID_REQUEST", e.getMessage());
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalState(IllegalStateException e) {
        return error(HttpStatus.CONFLICT, "INVALID_STATE", e.getMessage());
    }
    /**
     * 존재하지 않는 리소스 (404)
     * 기존 NoSuchElementException을 도메인별 커스텀 예외로 교체
     */
    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleNotFound(ResourceNotFoundException e) {
        return error(HttpStatus.NOT_FOUND, "NOT_FOUND", e.getMessage());
    }

    /**
     * 접근 권한 없음 (403)
     * "주최자만 가능", "본인 팀만 조회 가능", "본인 알림만 읽음 처리" 등
     */
    @ExceptionHandler(UnauthorizedAccessException.class)
    public ResponseEntity<Map<String, Object>> handleUnauthorizedAccess(UnauthorizedAccessException e) {
        return error(HttpStatus.FORBIDDEN, "ACCESS_DENIED", e.getMessage());
    }

    /**
     * 중복 출근 (409)
     */
    @ExceptionHandler(AlreadyClockedInException.class)
    public ResponseEntity<Map<String, Object>> handleAlreadyClockedIn(AlreadyClockedInException e) {
        return error(HttpStatus.CONFLICT, "ALREADY_CLOCKED_IN", e.getMessage());
    }

    /**
     * DB 유니크 제약 위반 — race condition 방어 처리
     * DIRECT 채팅방 / 출근 기록 동시 중복 INSERT 시 두 번째 요청이 여기로 처리됨
     */
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, Object>> handleDataIntegrity(DataIntegrityViolationException e) {
        return error(HttpStatus.CONFLICT, "DUPLICATE_REQUEST",
                "중복된 요청입니다. 잠시 후 다시 시도해주세요.");
    }

    // ── 공통 빌더 ─────────────────────────────────────────────────

    private ResponseEntity<Map<String, Object>> error(HttpStatus status, String code, String message) {
        return ResponseEntity.status(status).body(Map.of(
                "status", status.value(),
                "code", code,
                "message", message,
                "timestamp", LocalDateTime.now().toString()
        ));
    }
}
