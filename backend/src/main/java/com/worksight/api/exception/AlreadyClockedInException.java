package com.worksight.api.exception;

/** 중복 출근 시도 (409) */
public class AlreadyClockedInException extends RuntimeException {
    public AlreadyClockedInException() {
        super("이미 오늘 출근하셨습니다.");
    }
}
