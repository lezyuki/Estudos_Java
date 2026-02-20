package com.fruttz.backend.order;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(
        name = "orders",
        indexes = @Index(name = "ux_orders_date_seq", columnList = "order_date,daily_seq", unique = true)
)
public class OrderEntity {

    @Id
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(name = "order_date", nullable = false)
    private LocalDate orderDate;

    @Column(name = "daily_seq", nullable = false)
    private Integer dailySeq;

    @Column(name = "order_number", nullable = false, unique = true, length = 40)
    private String orderNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 40)
    private OrderStatus status;

    @Column(name = "subtotal", nullable = false, precision = 12, scale = 2)
    private BigDecimal subtotal;

    @Column(name = "shipping", nullable = false, precision = 12, scale = 2)
    private BigDecimal shipping;

    @Column(name = "total", nullable = false, precision = 12, scale = 2)
    private BigDecimal total;

    @Column(name = "customer_name", length = 120)
    private String customerName;

    @Column(name = "customer_phone", length = 40)
    private String customerPhone;

    @Column(name = "delivery_cep", length = 16)
    private String deliveryCep;

    @Column(name = "delivery_address_line", length = 200)
    private String deliveryAddressLine;

    @Column(name = "delivery_number", length = 40)
    private String deliveryNumber;

    @Column(name = "delivery_complement", length = 120)
    private String deliveryComplement;

    @Column(name = "delivery_neighborhood", length = 120)
    private String deliveryNeighborhood;

    @Column(name = "delivery_city", length = 120)
    private String deliveryCity;

    @Column(name = "delivery_state", length = 8)
    private String deliveryState;

    @Column(name = "txid", length = 80)
    private String txid;

    @Column(name = "pix_copy_paste", columnDefinition = "text")
    private String pixCopyPaste;

    // ✅ deixa o banco preencher (default now + trigger)
    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false, insertable = false, updatable = false)
    private OffsetDateTime updatedAt;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<OrderItemEntity> items = new ArrayList<>();

    @PrePersist
    void onCreate() {
        if (id == null) id = UUID.randomUUID();
        if (status == null) status = OrderStatus.CREATED;
        if (subtotal == null) subtotal = BigDecimal.ZERO;
        if (shipping == null) shipping = BigDecimal.ZERO;
        if (total == null) total = BigDecimal.ZERO;
    }

    // getters/setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public LocalDate getOrderDate() { return orderDate; }
    public void setOrderDate(LocalDate orderDate) { this.orderDate = orderDate; }

    public Integer getDailySeq() { return dailySeq; }
    public void setDailySeq(Integer dailySeq) { this.dailySeq = dailySeq; }

    public String getOrderNumber() { return orderNumber; }
    public void setOrderNumber(String orderNumber) { this.orderNumber = orderNumber; }

    public OrderStatus getStatus() { return status; }
    public void setStatus(OrderStatus status) { this.status = status; }

    public BigDecimal getSubtotal() { return subtotal; }
    public void setSubtotal(BigDecimal subtotal) { this.subtotal = subtotal; }

    public BigDecimal getShipping() { return shipping; }
    public void setShipping(BigDecimal shipping) { this.shipping = shipping; }

    public BigDecimal getTotal() { return total; }
    public void setTotal(BigDecimal total) { this.total = total; }

    public String getCustomerName() { return customerName; }
    public void setCustomerName(String customerName) { this.customerName = customerName; }

    public String getCustomerPhone() { return customerPhone; }
    public void setCustomerPhone(String customerPhone) { this.customerPhone = customerPhone; }

    public String getDeliveryCep() { return deliveryCep; }
    public void setDeliveryCep(String deliveryCep) { this.deliveryCep = deliveryCep; }

    public String getDeliveryAddressLine() { return deliveryAddressLine; }
    public void setDeliveryAddressLine(String deliveryAddressLine) { this.deliveryAddressLine = deliveryAddressLine; }

    public String getDeliveryNumber() { return deliveryNumber; }
    public void setDeliveryNumber(String deliveryNumber) { this.deliveryNumber = deliveryNumber; }

    public String getDeliveryComplement() { return deliveryComplement; }
    public void setDeliveryComplement(String deliveryComplement) { this.deliveryComplement = deliveryComplement; }

    public String getDeliveryNeighborhood() { return deliveryNeighborhood; }
    public void setDeliveryNeighborhood(String deliveryNeighborhood) { this.deliveryNeighborhood = deliveryNeighborhood; }

    public String getDeliveryCity() { return deliveryCity; }
    public void setDeliveryCity(String deliveryCity) { this.deliveryCity = deliveryCity; }

    public String getDeliveryState() { return deliveryState; }
    public void setDeliveryState(String deliveryState) { this.deliveryState = deliveryState; }

    public String getTxid() { return txid; }
    public void setTxid(String txid) { this.txid = txid; }

    public String getPixCopyPaste() { return pixCopyPaste; }
    public void setPixCopyPaste(String pixCopyPaste) { this.pixCopyPaste = pixCopyPaste; }

    public List<OrderItemEntity> getItems() { return items; }
    public void setItems(List<OrderItemEntity> items) { this.items = items; }
}
