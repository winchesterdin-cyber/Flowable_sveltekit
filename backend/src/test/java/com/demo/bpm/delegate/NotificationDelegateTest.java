package com.demo.bpm.delegate;

import com.demo.bpm.entity.Notification;
import com.demo.bpm.service.NotificationService;
import org.flowable.engine.delegate.DelegateExecution;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NotificationDelegateTest {

    @Mock
    private NotificationService notificationService;

    @Mock
    private DelegateExecution execution;

    @InjectMocks
    private NotificationDelegate delegate;

    @Test
    void execute_usesInitiatorAndDefaultsWhenValuesMissing() {
        when(execution.getVariable("assignee")).thenReturn(null);
        when(execution.getVariable("initiator")).thenReturn("  user-1  ");
        when(execution.getVariable("notificationTitle")).thenReturn(" ");
        when(execution.getVariable("notificationMessage")).thenReturn(null);
        when(execution.getVariable("notificationType")).thenReturn("sla_warning");
        when(execution.getVariable("notificationLink")).thenReturn("   ");
        when(execution.getProcessDefinitionId()).thenReturn("procDef1");

        delegate.execute(execution);

        ArgumentCaptor<String> userCaptor = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<String> titleCaptor = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<String> messageCaptor = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<Notification.NotificationType> typeCaptor = ArgumentCaptor.forClass(Notification.NotificationType.class);
        ArgumentCaptor<String> linkCaptor = ArgumentCaptor.forClass(String.class);

        verify(notificationService).createNotification(
            userCaptor.capture(),
            titleCaptor.capture(),
            messageCaptor.capture(),
            typeCaptor.capture(),
            linkCaptor.capture()
        );

        assertEquals("user-1", userCaptor.getValue());
        assertEquals("Process Update", titleCaptor.getValue());
        assertEquals("Process procDef1 updated.", messageCaptor.getValue());
        assertEquals(Notification.NotificationType.SLA_WARNING, typeCaptor.getValue());
        assertNull(linkCaptor.getValue());
    }

    @Test
    void execute_skipsNotificationWhenNoUserFound() {
        when(execution.getVariable(anyString())).thenReturn(null);
        when(execution.getVariable("initiator")).thenReturn("  ");

        delegate.execute(execution);

        verifyNoInteractions(notificationService);
    }

    @Test
    void execute_defaultsToSystemTypeWhenUnknown() {
        when(execution.getVariable("assignee")).thenReturn("user-2");
        when(execution.getVariable("notificationTitle")).thenReturn("Title");
        when(execution.getVariable("notificationMessage")).thenReturn("Message");
        when(execution.getVariable("notificationType")).thenReturn("unknown");
        when(execution.getVariable("notificationLink")).thenReturn(null);

        delegate.execute(execution);

        verify(notificationService).createNotification(
            "user-2",
            "Title",
            "Message",
            Notification.NotificationType.SYSTEM,
            null
        );
    }
}
