package com.ticketdesk.controller;

import com.ticketdesk.exception.ResourceNotFoundException;
import com.ticketdesk.model.Ticket;
import com.ticketdesk.model.TicketCategory;
import com.ticketdesk.model.TicketPriority;
import com.ticketdesk.model.TicketStatus;
import com.ticketdesk.repository.TicketRepository;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/tickets")
@CrossOrigin(origins = "*")
public class TicketController {

    private final TicketRepository ticketRepository;

    public TicketController(TicketRepository ticketRepository) {
        this.ticketRepository = ticketRepository;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Ticket createTicket(@Valid @RequestBody Ticket ticket) {
        return ticketRepository.save(ticket);
    }

    @GetMapping
    public List<Ticket> getAllTickets(
            @RequestParam(required = false) TicketStatus status,
            @RequestParam(required = false) TicketPriority priority,
            @RequestParam(required = false) TicketCategory category) {
        
        List<Ticket> tickets = ticketRepository.findAll();
        
        return tickets.stream()
                .filter(t -> status == null || t.getStatus() == status)
                .filter(t -> priority == null || t.getPriority() == priority)
                .filter(t -> category == null || t.getCategory() == category)
                .collect(java.util.stream.Collectors.toList());
    }

    @GetMapping("/{id}")
    public Ticket getTicketById(@PathVariable Long id) {
        return ticketRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket not found with id: " + id));
    }

    @PutMapping("/{id}")
    public Ticket updateTicket(@PathVariable Long id, @Valid @RequestBody Ticket ticketDetails) {
        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket not found with id: " + id));

        ticket.setTitle(ticketDetails.getTitle());
        ticket.setDescription(ticketDetails.getDescription());
        ticket.setStatus(ticketDetails.getStatus());
        ticket.setPriority(ticketDetails.getPriority());
        if (ticketDetails.getReportedBy() != null) {
            ticket.setReportedBy(ticketDetails.getReportedBy());
        }
        if (ticketDetails.getCategory() != null) {
            ticket.setCategory(ticketDetails.getCategory());
        }

        return ticketRepository.save(ticket);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteTicket(@PathVariable Long id) {
        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket not found with id: " + id));
        ticketRepository.delete(ticket);
    }

    @GetMapping("/dashboard")
    public Map<String, Object> getDashboardStats() {
        List<Ticket> tickets = ticketRepository.findAll();
        
        long total = tickets.size();
        
        Map<String, Long> statusCounts = new HashMap<>();
        for (TicketStatus status : TicketStatus.values()) {
            statusCounts.put(status.name(), 0L);
        }
        
        Map<String, Long> priorityCounts = new HashMap<>();
        for (TicketPriority priority : TicketPriority.values()) {
            priorityCounts.put(priority.name(), 0L);
        }
        
        for (Ticket ticket : tickets) {
            if (ticket.getStatus() != null) {
                statusCounts.put(ticket.getStatus().name(), statusCounts.get(ticket.getStatus().name()) + 1);
            }
            if (ticket.getPriority() != null) {
                priorityCounts.put(ticket.getPriority().name(), priorityCounts.get(ticket.getPriority().name()) + 1);
            }
        }
        
        Map<String, Object> stats = new HashMap<>();
        stats.put("total", total);
        stats.put("statusCounts", statusCounts);
        stats.put("priorityCounts", priorityCounts);
        
        return stats;
    }
}
