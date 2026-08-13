package com.ticketdesk.controller;

import tools.jackson.databind.ObjectMapper;
import com.ticketdesk.model.Comment;
import com.ticketdesk.model.Ticket;
import com.ticketdesk.model.TicketCategory;
import com.ticketdesk.model.TicketPriority;
import com.ticketdesk.model.TicketStatus;
import com.ticketdesk.model.User;
import com.ticketdesk.model.UserRole;
import com.ticketdesk.repository.CommentRepository;
import com.ticketdesk.repository.TicketRepository;
import com.ticketdesk.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.TestConstructor;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;
import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test") // will use default in-memory db setup since there's no custom test properties
@TestConstructor(autowireMode = TestConstructor.AutowireMode.ALL)
public class TicketControllerTest {

    private final MockMvc mockMvc;
    private final TicketRepository ticketRepository;
    private final CommentRepository commentRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    public TicketControllerTest(MockMvc mockMvc, TicketRepository ticketRepository, CommentRepository commentRepository, UserRepository userRepository, ObjectMapper objectMapper) {
        this.mockMvc = mockMvc;
        this.ticketRepository = ticketRepository;
        this.commentRepository = commentRepository;
        this.userRepository = userRepository;
        this.objectMapper = objectMapper;
    }

    @BeforeEach
    public void setup() {
        commentRepository.deleteAll();
        ticketRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    public void testCreateTicket() throws Exception {
        Ticket ticket = Ticket.builder()
                .title("Test Ticket")
                .description("Test description")
                .status(TicketStatus.OPEN)
                .priority(TicketPriority.MEDIUM)
                .category(TicketCategory.SOFTWARE)
                .build();

        mockMvc.perform(post("/api/tickets")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(ticket)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id", notNullValue()))
                .andExpect(jsonPath("$.title", is("Test Ticket")))
                .andExpect(jsonPath("$.status", is("OPEN")))
                .andExpect(jsonPath("$.priority", is("MEDIUM")));
    }

    @Test
    public void testGetAllTickets() throws Exception {
        Ticket ticket1 = Ticket.builder()
                .title("Ticket One")
                .status(TicketStatus.OPEN)
                .priority(TicketPriority.LOW)
                .category(TicketCategory.SOFTWARE)
                .build();
        Ticket ticket2 = Ticket.builder()
                .title("Ticket Two")
                .status(TicketStatus.IN_PROGRESS)
                .priority(TicketPriority.HIGH)
                .category(TicketCategory.HARDWARE)
                .build();

        ticketRepository.save(ticket1);
        ticketRepository.save(ticket2);

        mockMvc.perform(get("/api/tickets"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].title", anyOf(is("Ticket One"), is("Ticket Two"))))
                .andExpect(jsonPath("$[1].title", anyOf(is("Ticket One"), is("Ticket Two"))));
    }

    @Test
    public void testGetTicketById() throws Exception {
        Ticket ticket = Ticket.builder()
                .title("Get Me")
                .status(TicketStatus.OPEN)
                .priority(TicketPriority.LOW)
                .category(TicketCategory.SOFTWARE)
                .build();
        ticket = ticketRepository.save(ticket);

        mockMvc.perform(get("/api/tickets/" + ticket.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(ticket.getId().intValue())))
                .andExpect(jsonPath("$.title", is("Get Me")));
    }

    @Test
    public void testGetTicketByIdNotFound() throws Exception {
        mockMvc.perform(get("/api/tickets/999"))
                .andExpect(status().isNotFound());
    }

    @Test
    public void testUpdateTicket() throws Exception {
        Ticket ticket = Ticket.builder()
                .title("Old Title")
                .status(TicketStatus.OPEN)
                .priority(TicketPriority.LOW)
                .category(TicketCategory.SOFTWARE)
                .build();
        ticket = ticketRepository.save(ticket);

        Ticket updatedDetails = Ticket.builder()
                .title("New Title")
                .status(TicketStatus.IN_PROGRESS)
                .priority(TicketPriority.HIGH)
                .category(TicketCategory.SOFTWARE)
                .build();

        mockMvc.perform(put("/api/tickets/" + ticket.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updatedDetails)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title", is("New Title")))
                .andExpect(jsonPath("$.status", is("IN_PROGRESS")))
                .andExpect(jsonPath("$.priority", is("HIGH")));
    }

    @Test
    public void testGetDashboardStats() throws Exception {
        Ticket ticket1 = Ticket.builder()
                .title("T1")
                .status(TicketStatus.OPEN)
                .priority(TicketPriority.LOW)
                .category(TicketCategory.SOFTWARE)
                .build();
        Ticket ticket2 = Ticket.builder()
                .title("T2")
                .status(TicketStatus.OPEN)
                .priority(TicketPriority.MEDIUM)
                .category(TicketCategory.HARDWARE)
                .build();
        Ticket ticket3 = Ticket.builder()
                .title("T3")
                .status(TicketStatus.IN_PROGRESS)
                .priority(TicketPriority.HIGH)
                .category(TicketCategory.SOFTWARE)
                .build();

        ticketRepository.save(ticket1);
        ticketRepository.save(ticket2);
        ticketRepository.save(ticket3);

        mockMvc.perform(get("/api/tickets/dashboard"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total", is(3)))
                .andExpect(jsonPath("$.statusCounts.OPEN", is(2)))
                .andExpect(jsonPath("$.statusCounts.IN_PROGRESS", is(1)))
                .andExpect(jsonPath("$.priorityCounts.LOW", is(1)))
                .andExpect(jsonPath("$.priorityCounts.MEDIUM", is(1)))
                .andExpect(jsonPath("$.priorityCounts.HIGH", is(1)));
    }

    @Test
    public void testCommentsEndpoints() throws Exception {
        Ticket ticket = Ticket.builder()
                .title("Comment Ticket")
                .status(TicketStatus.OPEN)
                .priority(TicketPriority.LOW)
                .category(TicketCategory.SOFTWARE)
                .build();
        ticket = ticketRepository.save(ticket);

        Comment comment = Comment.builder()
                .author("john_doe")
                .text("This is a test comment")
                .build();

        // Test POST /api/tickets/{id}/comments
        mockMvc.perform(post("/api/tickets/" + ticket.getId() + "/comments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(comment)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id", notNullValue()))
                .andExpect(jsonPath("$.ticketId", is(ticket.getId().intValue())))
                .andExpect(jsonPath("$.author", is("john_doe")))
                .andExpect(jsonPath("$.text", is("This is a test comment")));

        // Test GET /api/tickets/{id}/comments
        mockMvc.perform(get("/api/tickets/" + ticket.getId() + "/comments"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].author", is("john_doe")))
                .andExpect(jsonPath("$[0].text", is("This is a test comment")));
    }

    @Test
    public void testAssignTicket() throws Exception {
        Ticket ticket = Ticket.builder()
                .title("To Assign")
                .status(TicketStatus.OPEN)
                .priority(TicketPriority.LOW)
                .category(TicketCategory.SOFTWARE)
                .build();
        ticket = ticketRepository.save(ticket);

        Map<String, String> body = Map.of("assignedTo", "agent_smith");

        mockMvc.perform(put("/api/tickets/" + ticket.getId() + "/assign")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.assignedTo", is("agent_smith")));
    }

    @Test
    public void testResolveTicket() throws Exception {
        Ticket ticket = Ticket.builder()
                .title("To Resolve")
                .status(TicketStatus.OPEN)
                .priority(TicketPriority.LOW)
                .category(TicketCategory.SOFTWARE)
                .build();
        ticket = ticketRepository.save(ticket);

        Map<String, String> body = Map.of("resolution", "Fixed the bug in production.");

        mockMvc.perform(put("/api/tickets/" + ticket.getId() + "/resolve")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("RESOLVED")))
                .andExpect(jsonPath("$.resolution", is("Fixed the bug in production.")));
    }

    @Test
    public void testReopenTicket() throws Exception {
        Ticket ticket = Ticket.builder()
                .title("To Reopen")
                .status(TicketStatus.RESOLVED)
                .priority(TicketPriority.LOW)
                .category(TicketCategory.SOFTWARE)
                .resolution("Already fixed")
                .assignedTo("agent_smith")
                .build();
        ticket = ticketRepository.save(ticket);

        mockMvc.perform(put("/api/tickets/" + ticket.getId() + "/reopen"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("IN_PROGRESS")))
                .andExpect(jsonPath("$.resolution", nullValue()));
        
        Ticket ticketNoAssignee = Ticket.builder()
                .title("To Reopen 2")
                .status(TicketStatus.RESOLVED)
                .priority(TicketPriority.LOW)
                .category(TicketCategory.SOFTWARE)
                .resolution("Already fixed")
                .build();
        ticketNoAssignee = ticketRepository.save(ticketNoAssignee);

        mockMvc.perform(put("/api/tickets/" + ticketNoAssignee.getId() + "/reopen"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("OPEN")))
                .andExpect(jsonPath("$.resolution", nullValue()));
    }

    @Test
    public void testUserManagement() throws Exception {
        User user1 = User.builder()
                .username("alice")
                .password("pass123")
                .role(UserRole.EMPLOYEE)
                .build();
        User user2 = User.builder()
                .username("bob")
                .password("pass456")
                .role(UserRole.ADMIN)
                .build();
        userRepository.save(user1);
        userRepository.save(user2);

        // Test GET /api/users
        mockMvc.perform(get("/api/users"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].username", anyOf(is("alice"), is("bob"))));

        // Test PUT /api/users/{username}/role
        mockMvc.perform(put("/api/users/alice/role")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("role", "ADMIN"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role", is("ADMIN")));

        // Test DELETE /api/users/{username}
        mockMvc.perform(delete("/api/users/alice"))
                .andExpect(status().isNoContent());

        // Verify deletion
        mockMvc.perform(get("/api/users"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].username", is("bob")));
    }
}
