package com.worksight.api.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // 클라이언트(관리자 대시보드)가 구독할 prefix
        config.enableSimpleBroker("/topic");
        // 클라이언트에서 서버로 보낼 때 사용할 prefix
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // React 프론트엔드에서 웹소켓 연결을 위한 엔드포인트
        registry.addEndpoint("/ws-monitoring")
                .setAllowedOriginPatterns("http://localhost:5173")
                .withSockJS();
    }
}