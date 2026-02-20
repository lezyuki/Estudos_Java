package com.fruttz.backend.order;

import com.fruttz.backend.order.dto.CreateOrderRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/orders")
@CrossOrigin(origins = "*")
public class OrderController {

    private final OrderService service;
    private final OrderRepository repo;

    public OrderController(OrderService service, OrderRepository repo) {
        this.service = service;
        this.repo = repo;
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody CreateOrderRequest req) {
        if (req == null || req.items == null || req.items.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Pedido sem itens"));
        }
        if (req.pricing == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "pricing é obrigatório"));
        }

        OrderEntity created = service.create(req);

        // ✅ devolve já com itens carregados
        OrderEntity full = repo.findByIdWithItems(created.getId()).orElse(created);
        return ResponseEntity.ok(toResponse(full));
    }

    // ✅ LISTA LEVE (sem items)
    @GetMapping
    public ResponseEntity<?> list() {
        List<OrderEntity> orders = repo.findAll();
        List<Map<String, Object>> out = orders.stream().map(this::toResponseWithoutItems).toList();
        return ResponseEntity.ok(out);
    }

    // ✅ LISTA COMPLETA (com items) - opcional (útil pro admin)
    @GetMapping("/full")
    public ResponseEntity<?> listFull() {
        List<OrderEntity> orders = repo.findAllWithItems();
        List<Map<String, Object>> out = orders.stream().map(this::toResponse).toList();
        return ResponseEntity.ok(out);
    }

    // ✅ AQUI está o /api/orders/{id}
    @GetMapping("/{id}")
    public ResponseEntity<?> get(@PathVariable String id) {
        try {
            UUID uuid = UUID.fromString(id);
            OrderEntity o = repo.findByIdWithItems(uuid).orElseThrow();
            return ResponseEntity.ok(toResponse(o));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(404).body(Map.of("error", "Pedido não encontrado"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "ID inválido"));
        }
    }

    @PostMapping("/{id}/pix")
    public ResponseEntity<?> createPix(@PathVariable String id) {
        try {
            UUID uuid = UUID.fromString(id);
            OrderEntity o = service.createPix(uuid);

            Map<String, Object> pix = new LinkedHashMap<>();
            pix.put("orderId", o.getId().toString());
            pix.put("status", String.valueOf(o.getStatus())); // WAITING_PAYMENT
            pix.put("txid", o.getTxid());
            pix.put("copyPaste", o.getPixCopyPaste());
            pix.put("qrCodeBase64", null);
            pix.put("orderNumber", o.getOrderNumber());

            return ResponseEntity.ok(pix);
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(404).body(Map.of("error", "Pedido não encontrado"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "ID inválido"));
        }
    }

    @PostMapping("/{id}/pay")
    public ResponseEntity<?> markPaid(@PathVariable String id) {
        try {
            UUID uuid = UUID.fromString(id);
            OrderEntity o = service.markPaid(uuid);

            OrderEntity full = repo.findByIdWithItems(o.getId()).orElse(o);
            return ResponseEntity.ok(toResponse(full));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(404).body(Map.of("error", "Pedido não encontrado"));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "ID inválido"));
        }
    }

    // ✅ NOVO: atualizar status (para o painel / comanda)
    // body: { "status": "PREPARING" }
    @PostMapping("/{id}/status")
    public ResponseEntity<?> setStatus(@PathVariable String id, @RequestBody Map<String, String> body) {
        try {
            UUID uuid = UUID.fromString(id);

            String status = body.get("status");
            if (status == null || status.isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("error", "status é obrigatório"));
            }

            OrderEntity o = service.setStatus(uuid, status);

            OrderEntity full = repo.findByIdWithItems(o.getId()).orElse(o);
            return ResponseEntity.ok(toResponse(full));

        } catch (NoSuchElementException e) {
            return ResponseEntity.status(404).body(Map.of("error", "Pedido não encontrado"));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (IllegalArgumentException e) {
            // pega tanto UUID inválido quanto status inválido (valueOf)
            return ResponseEntity.badRequest().body(Map.of("error", "ID ou status inválido"));
        }
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<?> cancel(@PathVariable String id) {
        try {
            UUID uuid = UUID.fromString(id);
            OrderEntity o = service.cancel(uuid);

            OrderEntity full = repo.findByIdWithItems(o.getId()).orElse(o);
            return ResponseEntity.ok(toResponse(full));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(404).body(Map.of("error", "Pedido não encontrado"));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "ID inválido"));
        }
    }

    // ===== Resposta COMPLETA (com items) =====
    private Map<String, Object> toResponse(OrderEntity o) {
        Map<String, Object> resp = baseResponse(o);

        List<Map<String, Object>> items = new ArrayList<>();
        if (o.getItems() != null) {
            for (OrderItemEntity it : o.getItems()) {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("sku", it.getSku());
                m.put("name", it.getName());
                m.put("category", it.getCategory());
                m.put("size", it.getSize());
                m.put("quantity", it.getQuantity());
                m.put("unitPrice", it.getUnitPrice());
                m.put("total", it.getTotal());
                m.put("addons", it.getAddonsJson()); // pode ser JsonNode/String dependendo do seu entity
                m.put("sucoPrep", it.getSucoPrep());
                m.put("sucoSugar", it.getSucoSugar());
                items.add(m);
            }
        }
        resp.put("items", items);

        return resp;
    }

    // ===== Resposta SEM items (pra listagem) =====
    private Map<String, Object> toResponseWithoutItems(OrderEntity o) {
        return baseResponse(o);
    }

    private Map<String, Object> baseResponse(OrderEntity o) {
        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("id", o.getId().toString());
        resp.put("orderNumber", o.getOrderNumber());
        resp.put("status", String.valueOf(o.getStatus()));

        // ✅ AQUI: DEVOLVE CUSTOMER PRO FRONT (ADM/CLIENTE)
        Map<String, Object> customer = new LinkedHashMap<>();
        customer.put("name", o.getCustomerName());
        customer.put("phone", o.getCustomerPhone());
        resp.put("customer", customer);

        Map<String, Object> pricing = new LinkedHashMap<>();
        pricing.put("subtotal", o.getSubtotal());
        pricing.put("shipping", o.getShipping());
        pricing.put("total", o.getTotal());
        resp.put("pricing", pricing);

        Map<String, Object> delivery = new LinkedHashMap<>();
        delivery.put("method", "DELIVERY");
        delivery.put("cep", o.getDeliveryCep());
        delivery.put("addressLine", o.getDeliveryAddressLine());
        delivery.put("number", o.getDeliveryNumber());
        delivery.put("complement", o.getDeliveryComplement());
        delivery.put("neighborhood", o.getDeliveryNeighborhood());
        delivery.put("city", o.getDeliveryCity());
        delivery.put("state", o.getDeliveryState());
        resp.put("delivery", delivery);

        Map<String, Object> payment = new LinkedHashMap<>();
        payment.put("txid", o.getTxid());
        payment.put("copyPaste", o.getPixCopyPaste());
        resp.put("payment", payment);

        return resp;
    }
}
