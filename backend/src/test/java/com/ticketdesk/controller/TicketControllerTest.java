package com.ticketdesk.controller;

import tools.jackson.databind.ObjectMapper;
import com.ticketdesk.model.Ticket;
import com.ticketdesk.model.TicketCategory;
import com.ticketdesk.model.TicketPriority;
import com.ticketdesk.model.TicketStatus;
import com.ticketdesk.repository.TicketRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.TestConstructor;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

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
    private final ObjectMapper objectMapper;

    public TicketControllerTest(MockMvc mockMvc, TicketRepository ticketRepository, ObjectMapper objectMapper) {
        this.mockMvc = mockMvc;
        this.ticketRepository = ticketRepository;
        this.objectMapper = objectMapper;
    }

    @BeforeEach
    public void setup() {
        ticketRepository.deleteAll();
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
}
