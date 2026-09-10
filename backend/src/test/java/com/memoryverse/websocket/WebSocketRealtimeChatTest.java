package com.memoryverse.websocket;

import com.memoryverse.config.websocket.WebSocketAuthChannelInterceptor;
import com.memoryverse.controller.ChatWebSocketController;
import com.memoryverse.dto.realtime.ChatMessageReadDto;
import com.memoryverse.dto.realtime.ChatPresenceDto;
import com.memoryverse.dto.realtime.ChatRealtimeEvent;
import com.memoryverse.dto.realtime.ChatRealtimeEventType;
import com.memoryverse.dto.realtime.ChatTypingDto;
import com.memoryverse.dto.request.ChatMessageSendDto;
import com.memoryverse.dto.request.ChatTypingRequestDto;
import com.memoryverse.dto.response.ChatMessageDto;
import com.memoryverse.entity.User;
import com.memoryverse.exception.ForbiddenException;
import com.memoryverse.exception.UnauthorizedException;
import com.memoryverse.repository.ChatGroupMemberRepository;
import com.memoryverse.repository.UserRepository;
import com.memoryverse.security.JwtTokenProvider;
import com.memoryverse.security.UserPrincipal;
import com.memoryverse.service.ChatMessageService;
import com.memoryverse.service.ChatRealtimeEventPublisher;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WebSocketRealtimeChatTest {

    @Mock
    private JwtTokenProvider jwtTokenProvider;

    @Mock
    private UserRepository userRepository;

    @Mock
    private ChatGroupMemberRepository chatGroupMemberRepository;

    @Mock
    private MessageChannel messageChannel;

    @Mock
    private SimpMessagingTemplate simpMessagingTemplate;

    @Mock
    private ChatMessageService chatMessageService;

    @InjectMocks
    private WebSocketAuthChannelInterceptor interceptor;

    @InjectMocks
    private ChatRealtimeEventPublisher eventPublisher;

    private ChatWebSocketController webSocketController;

    private UUID userId;
    private UUID groupId;
    private User testUser;
    private UserPrincipal principal;
    private Authentication authentication;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        groupId = UUID.randomUUID();

        testUser = User.builder()
                .id(userId)
                .email("testuser@example.com")
                .fullName("Test User")
                .build();

        principal = UserPrincipal.create(userId, "testuser@example.com", "Test User", "password", "USER");
        authentication = new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());

        webSocketController = new ChatWebSocketController(chatMessageService);
    }

    @Test
    @DisplayName("STOMP CONNECT with valid Bearer token should authenticate session successfully")
    void testConnectWithValidToken() {
        String token = "valid.jwt.token";
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        accessor.setLeaveMutable(true);
        accessor.setNativeHeader("Authorization", "Bearer " + token);
        Message<byte[]> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        when(jwtTokenProvider.validateToken(token)).thenReturn(true);
        when(jwtTokenProvider.getUserIdFromToken(token)).thenReturn(userId);
        when(jwtTokenProvider.getEmailFromToken(token)).thenReturn("testuser@example.com");
        when(jwtTokenProvider.getRoleFromToken(token)).thenReturn("USER");
        when(userRepository.findById(userId)).thenReturn(Optional.of(testUser));

        Message<?> result = interceptor.preSend(message, messageChannel);

        assertNotNull(result);
        StompHeaderAccessor resultAccessor = StompHeaderAccessor.wrap(result);
        assertNotNull(resultAccessor.getUser());
        assertTrue(resultAccessor.getUser() instanceof Authentication);
        Authentication auth = (Authentication) resultAccessor.getUser();
        UserPrincipal p = (UserPrincipal) auth.getPrincipal();
        assertEquals(userId, p.getId());
        assertEquals("testuser@example.com", p.getEmail());
    }

    @Test
    @DisplayName("STOMP CONNECT with invalid token should throw UnauthorizedException")
    void testConnectWithInvalidTokenThrows() {
        String token = "invalid.token";
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        accessor.setLeaveMutable(true);
        accessor.setNativeHeader("Authorization", "Bearer " + token);
        Message<byte[]> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        when(jwtTokenProvider.validateToken(token)).thenReturn(false);

        assertThrows(UnauthorizedException.class, () -> interceptor.preSend(message, messageChannel));
    }

    @Test
    @DisplayName("STOMP CONNECT with missing Authorization header should throw UnauthorizedException")
    void testConnectWithoutTokenThrows() {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        accessor.setLeaveMutable(true);
        Message<byte[]> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        assertThrows(UnauthorizedException.class, () -> interceptor.preSend(message, messageChannel));
    }

    @Test
    @DisplayName("STOMP SUBSCRIBE by group member should succeed")
    void testSubscribeGroupMemberAllowed() {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setDestination("/topic/chat/groups/" + groupId);
        accessor.setUser(authentication);
        Message<byte[]> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        when(chatGroupMemberRepository.existsByChatGroupIdAndUserId(groupId, userId)).thenReturn(true);

        Message<?> result = interceptor.preSend(message, messageChannel);
        assertNotNull(result);
        verify(chatGroupMemberRepository).existsByChatGroupIdAndUserId(groupId, userId);
    }

    @Test
    @DisplayName("STOMP SUBSCRIBE by non-member should throw ForbiddenException")
    void testSubscribeNonMemberForbidden() {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setDestination("/topic/chat/groups/" + groupId);
        accessor.setUser(authentication);
        Message<byte[]> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        when(chatGroupMemberRepository.existsByChatGroupIdAndUserId(groupId, userId)).thenReturn(false);

        assertThrows(ForbiddenException.class, () -> interceptor.preSend(message, messageChannel));
    }

    @Test
    @DisplayName("STOMP SUBSCRIBE without authentication should throw UnauthorizedException")
    void testSubscribeUnauthenticatedForbidden() {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setDestination("/topic/chat/groups/" + groupId);
        Message<byte[]> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        assertThrows(UnauthorizedException.class, () -> interceptor.preSend(message, messageChannel));
    }

    @Test
    @DisplayName("ChatRealtimeEventPublisher broadcasts ChatRealtimeEvent to correct STOMP destination")
    void testEventPublisherBroadcast() {
        ChatMessageDto dto = ChatMessageDto.builder()
                .id(UUID.randomUUID())
                .chatGroupId(groupId)
                .textContent("Hello Realtime")
                .createdAt(Instant.now())
                .build();

        eventPublisher.publishMessageCreated(groupId, dto);

        ArgumentCaptor<String> destinationCaptor = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<ChatRealtimeEvent> eventCaptor = ArgumentCaptor.forClass(ChatRealtimeEvent.class);

        verify(simpMessagingTemplate).convertAndSend(destinationCaptor.capture(), eventCaptor.capture());

        assertEquals("/topic/chat/groups/" + groupId, destinationCaptor.getValue());
        ChatRealtimeEvent capturedEvent = eventCaptor.getValue();
        assertEquals(ChatRealtimeEventType.MESSAGE_CREATED, capturedEvent.getEventType());
        assertEquals(groupId, capturedEvent.getGroupId());
        assertEquals(dto, capturedEvent.getPayload());
    }

    @Test
    @DisplayName("ChatWebSocketController delegates to ChatMessageService with authenticated user")
    void testWebSocketControllerSendMessage() {
        ChatMessageSendDto sendDto = ChatMessageSendDto.builder()
                .textContent("WebSocket text")
                .clientMessageId("ws-client-uuid-123")
                .build();

        webSocketController.handleSendMessage(groupId, sendDto, authentication);

        ArgumentCaptor<ChatMessageSendDto> dtoCaptor = ArgumentCaptor.forClass(ChatMessageSendDto.class);
        ArgumentCaptor<UUID> userCaptor = ArgumentCaptor.forClass(UUID.class);

        verify(chatMessageService).sendMessage(dtoCaptor.capture(), userCaptor.capture());

        assertEquals(groupId, dtoCaptor.getValue().getChatGroupId());
        assertEquals("WebSocket text", dtoCaptor.getValue().getTextContent());
        assertEquals(userId, userCaptor.getValue());
    }

    @Test
    @DisplayName("ChatWebSocketController handles typing indicator delegation")
    void testWebSocketControllerHandleTyping() {
        ChatTypingRequestDto typingDto = ChatTypingRequestDto.builder().typing(true).build();

        webSocketController.handleTyping(groupId, typingDto, authentication);

        verify(chatMessageService).broadcastTyping(eq(groupId), eq(userId), eq("Test User"), eq(true));
    }

    @Test
    @DisplayName("ChatRealtimeEventPublisher broadcasts TYPING, PRESENCE, and MESSAGE_READ events")
    void testPublishTypingPresenceAndRead() {
        eventPublisher.publishTyping(groupId, userId, "Test User", true);
        verify(simpMessagingTemplate).convertAndSend(eq("/topic/chat/groups/" + groupId), any(ChatRealtimeEvent.class));

        eventPublisher.publishPresence(groupId, userId, "Test User", "ONLINE");
        verify(simpMessagingTemplate, times(2)).convertAndSend(eq("/topic/chat/groups/" + groupId), any(ChatRealtimeEvent.class));

        UUID msgId = UUID.randomUUID();
        eventPublisher.publishMessageRead(groupId, userId, msgId, Instant.now());
        verify(simpMessagingTemplate, times(3)).convertAndSend(eq("/topic/chat/groups/" + groupId), any(ChatRealtimeEvent.class));
    }
}
