package com.fruttz.backend.order;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fruttz.backend.order.dto.CreateOrderRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

@Service
public class OrderService {

    private final OrderRepository repo;
    private final ObjectMapper om;

    public OrderService(OrderRepository repo, ObjectMapper om) {
        this.repo = repo;
        this.om = om;
    }

    private static BigDecimal bd(double v) {
        return BigDecimal.valueOf(v).setScale(2, RoundingMode.HALF_UP);
    }

    @Transactional
    public OrderEntity create(CreateOrderRequest req) {
        LocalDate today = LocalDate.now();

        int nextSeq = repo.findMaxDailySeq(today) + 1;
        String ymd = today.format(DateTimeFormatter.BASIC_ISO_DATE); // 20260216
        String orderNumber = ymd + "-FRUTTZ-" + String.format("%03d", nextSeq);

        OrderEntity o = new OrderEntity();
        o.setId(UUID.randomUUID());
        o.setOrderDate(today);
        o.setDailySeq(nextSeq);
        o.setOrderNumber(orderNumber);

        // ✅ melhor alinhado com o fluxo do app:
        // Pedido acabou de ser criado, ainda não tem Pix gerado => CREATED
        // Quando gerar Pix, vira WAITING_PAYMENT
        o.setStatus(OrderStatus.CREATED);

        // pricing
        double subtotal = (req.pricing != null ? req.pricing.subtotal : 0);
        double shipping = (req.pricing != null ? req.pricing.shipping : 0);
        double total = (req.pricing != null ? req.pricing.total : (subtotal + shipping));

        o.setSubtotal(bd(subtotal));
        o.setShipping(bd(shipping));
        o.setTotal(bd(total));

        // customer
        if (req.customer != null) {
            o.setCustomerName(req.customer.name);
            o.setCustomerPhone(req.customer.phone);
        }

        // delivery
        if (req.delivery != null) {
            o.setDeliveryCep(req.delivery.cep);
            o.setDeliveryAddressLine(req.delivery.addressLine);
            o.setDeliveryNumber(req.delivery.number);
            o.setDeliveryComplement(req.delivery.complement);
            o.setDeliveryNeighborhood(req.delivery.neighborhood);
            o.setDeliveryCity(req.delivery.city);
            o.setDeliveryState(req.delivery.state);
        }

        // items
        if (req.items != null) {
            for (CreateOrderRequest.Item it : req.items) {
                OrderItemEntity item = new OrderItemEntity();
                item.setOrder(o);

                item.setSku(it.sku);
                item.setName(it.name);
                item.setCategory(it.category);
                item.setSize(it.size);

                int qty = (it.quantity <= 0 ? 1 : it.quantity);
                item.setQuantity(qty);

                item.setUnitPrice(bd(it.unitPrice));
                item.setTotal(bd(it.total));

                item.setSucoPrep(it.sucoPrep);
                item.setSucoSugar(it.sucoSugar);

                // ✅ addons como JSONB (JsonNode)
                try {
                    JsonNode node = (it.addons == null) ? null : om.valueToTree(it.addons);
                    item.setAddonsJson(node);
                } catch (Exception e) {
                    item.setAddonsJson(null);
                }

                o.getItems().add(item);
            }
        }

        return repo.save(o);
    }

    // ✅ evita LazyInitializationException (order + items)
    public OrderEntity get(UUID id) {
        return repo.findByIdWithItems(id).orElseThrow();
    }

    @Transactional
    public OrderEntity createPix(UUID id) {
        OrderEntity o = repo.findById(id).orElseThrow();

        String txid = "FRUTTZ-" + id.toString().replace("-", "").substring(0, 8).toUpperCase();
        String copyPaste = "PIX_MOCK_" + txid;

        o.setTxid(txid);
        o.setPixCopyPaste(copyPaste);

        // ✅ ao gerar Pix, entra em aguardando pagamento
        o.setStatus(OrderStatus.WAITING_PAYMENT);

        return repo.save(o);
    }

    @Transactional
    public OrderEntity markPaid(UUID id) {
        OrderEntity o = repo.findById(id).orElseThrow();

        if (o.getStatus() != OrderStatus.WAITING_PAYMENT) {
            throw new IllegalStateException("Pedido não está aguardando pagamento");
        }

        o.setStatus(OrderStatus.PAID);
        return repo.save(o);
    }

    @Transactional
    public OrderEntity cancel(UUID id) {
        OrderEntity o = repo.findById(id).orElseThrow();

        if (o.getStatus() == OrderStatus.PAID) {
            throw new IllegalStateException("Pedido já está pago e não pode ser cancelado");
        }

        o.setStatus(OrderStatus.CANCELED);
        return repo.save(o);
    }

    // ✅ NOVO: atualizado pelo painel (comanda)
    @Transactional
    public OrderEntity setStatus(UUID id, String statusRaw) {
        OrderEntity o = repo.findById(id).orElseThrow();

        if (statusRaw == null || statusRaw.isBlank()) {
            throw new IllegalArgumentException("status inválido");
        }

        OrderStatus next = OrderStatus.valueOf(statusRaw.trim().toUpperCase());

        // ✅ regras simples (pra não bagunçar)
        if (o.getStatus() == OrderStatus.CANCELED) {
            throw new IllegalStateException("Pedido cancelado não pode mudar status");
        }
        if (o.getStatus() == OrderStatus.DELIVERED) {
            throw new IllegalStateException("Pedido entregue não pode mudar status");
        }

        // (Opcional) impedir pular pra frente sem estar pago
        if ((next == OrderStatus.PREPARING || next == OrderStatus.OUT_FOR_DELIVERY || next == OrderStatus.DELIVERED)
                && o.getStatus() != OrderStatus.PAID
                && o.getStatus() != OrderStatus.PREPARING
                && o.getStatus() != OrderStatus.OUT_FOR_DELIVERY) {
            throw new IllegalStateException("Só é possível avançar depois de estar PAGO");
        }

        o.setStatus(next);
        return repo.save(o);
    }
}
