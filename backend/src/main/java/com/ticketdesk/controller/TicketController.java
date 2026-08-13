package com.ticketdesk.controller;

import com.ticketdesk.exception.ResourceNotFoundException;
import com.ticketdesk.model.Comment;
import com.ticketdesk.model.Ticket;
import com.ticketdesk.model.TicketCategory;
import com.ticketdesk.model.TicketPriority;
import com.ticketdesk.model.TicketStatus;
import com.ticketdesk.repository.CommentRepository;
import com.ticketdesk.repository.TicketRepository;
import com.ticketdesk.repository.UserRepository;
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
    private final CommentRepository commentRepository;
    private final UserRepository userRepository;

    public TicketController(TicketRepository ticketRepository, CommentRepository commentRepository, UserRepository userRepository) {
        this.ticketRepository = ticketRepository;
        this.commentRepository = commentRepository;
        this.userRepository = userRepository;
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
        ticket.setAssignedTo(ticketDetails.getAssignedTo());
        ticket.setResolution(ticketDetails.getResolution());
        ticket.setAttachmentKey(ticketDetails.getAttachmentKey());

        return ticketRepository.save(ticket);
    }

    @GetMapping("/{id}/comments")
    public List<Comment> getComments(@PathVariable Long id) {
        return commentRepository.findByTicketId(id);
    }

    @PostMapping("/{id}/comments")
    @ResponseStatus(HttpStatus.CREATED)
    public Comment addComment(@PathVariable Long id, @Valid @RequestBody Comment comment) {
        comment.setTicketId(id);
        return commentRepository.save(comment);
    }

    @PutMapping("/{id}/assign")
    public Ticket assignTicket(@PathVariable Long id, @RequestBody Map<String, String> body) {
        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket not found with id: " + id));
        String assignedTo = body.get("assignedTo");
        ticket.setAssignedTo(assignedTo);
        ticket.setUpdatedAt(java.time.LocalDateTime.now());
        return ticketRepository.save(ticket);
    }

    @PutMapping("/{id}/resolve")
    public Ticket resolveTicket(@PathVariable Long id, @RequestBody Map<String, String> body) {
        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket not found with id: " + id));
        String resolution = body.get("resolution");
        ticket.setStatus(TicketStatus.RESOLVED);
        ticket.setResolution(resolution);
        ticket.setUpdatedAt(java.time.LocalDateTime.now());
        return ticketRepository.save(ticket);
    }

    @PutMapping("/{id}/reopen")
    public Ticket reopenTicket(@PathVariable Long id) {
        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket not found with id: " + id));
        if (ticket.getAssignedTo() != null && !ticket.getAssignedTo().trim().isEmpty()) {
            ticket.setStatus(TicketStatus.IN_PROGRESS);
        } else {
            ticket.setStatus(TicketStatus.OPEN);
        }
        ticket.setResolution(null);
        ticket.setUpdatedAt(java.time.LocalDateTime.now());
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
