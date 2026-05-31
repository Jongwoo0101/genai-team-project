package com.worksight.api.security;

import com.worksight.api.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessagingException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Component;

/**
 * [신규 - 개선 1-2] WebSocket STOMP 인증 인터셉터
 * HTTP 레이어의 JwtAuthenticationFilter와 별개로,
 * STOMP CONNECT 커맨드 시점에 Authorization 헤더의 JWT를 검증한다.
 * 인증 실패 시 MessagingException을 던져 연결을 거부한다.
 * 클라이언트 연결 예시 (SockJS + STOMP):
 *   stompClient.connect({ Authorization: "Bearer <accessToken>" }, onConnect);
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class WebSocketAuthInterceptor implements ChannelInterceptor {

    private final JwtProvider jwtProvider;
    private final MemberRepository memberRepository;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor =
                MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (accessor == null) {
            return message;
        }

        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            String bearerToken = accessor.getFirstNativeHeader("Authorization");

            if (bearerToken == null || !bearerToken.startsWith("Bearer ")) {
                log.warn("WebSocket CONNECT 거부: Authorization 헤더 없음");
                throw new MessagingException("WebSocket 연결에 Authorization 헤더가 필요합니다.");
            }

            String jwt = bearerToken.substring(7);

            if (!jwtProvider.isValid(jwt)) {
                log.warn("WebSocket CONNECT 거부: 유효하지 않은 JWT");
                throw new MessagingException("유효하지 않은 토큰입니다.");
            }

            if (!jwtProvider.isAccessToken(jwt)) {
                log.warn("WebSocket CONNECT 거부: Refresh Token으로 연결 시도");
                throw new MessagingException("Access Token만 WebSocket 연결에 사용할 수 있습니다.");
            }

            Long userId = jwtProvider.getUserId(jwt);

            memberRepository.findById(userId).ifPresentOrElse(
                    member -> {
                        UsernamePasswordAuthenticationToken auth =
                                new UsernamePasswordAuthenticationToken(
                                        member, null, member.getAuthorities());
                        accessor.setUser(auth);
                        log.info("WebSocket 인증 성공: memberId={}, username={}",
                                member.getId(), member.getUsername());
                    },
                    () -> {
                        log.warn("WebSocket CONNECT 거부: 존재하지 않는 사용자 id={}", userId);
                        throw new MessagingException("존재하지 않는 사용자입니다.");
                    }
            );
        }

        return message;
    }
}
