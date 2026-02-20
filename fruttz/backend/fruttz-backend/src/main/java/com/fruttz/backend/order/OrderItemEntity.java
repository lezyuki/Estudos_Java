package com.fruttz.backend.order;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "order_items")
public class OrderItemEntity {

    @Id
    @Column(columnDefinition = "uuid")
    private UUID id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id")
    private OrderEntity order;

    @Column(length = 80)
    private String sku;

    @Column(nullable = false, length = 160)
    private String name;

    @Column(length = 80)
    private String category;

    @Column(length = 40)
    private String size;

    @Column(nullable = false)
    private Integer quantity;

    @Column(name = "unit_price", nullable = false, precision = 12, scale = 2)
    private BigDecimal unitPrice;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal total;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "addons_json", columnDefinition = "jsonb")
    private JsonNode addonsJson;

    @Column(name = "suco_prep", length = 60)
    private String sucoPrep;

    @Column(name = "suco_sugar", length = 60)
    private String sucoSugar;

    @PrePersist
    void onCreate() {
        if (id == null) id = UUID.randomUUID();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public OrderEntity getOrder() { return order; }
    public void setOrder(OrderEntity order) { this.order = order; }

    public String getSku() { return sku; }
    public void setSku(String sku) { this.sku = sku; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getSize() { return size; }
    public void setSize(String size) { this.size = size; }

    public Integer getQuantity() { return quantity; }
    public void setQuantity(Integer quantity) { this.quantity = quantity; }

    public BigDecimal getUnitPrice() { return unitPrice; }
    public void setUnitPrice(BigDecimal unitPrice) { this.unitPrice = unitPrice; }

    public BigDecimal getTotal() { return total; }
    public void setTotal(BigDecimal total) { this.total = total; }

    public JsonNode getAddonsJson() { return addonsJson; }
    public void setAddonsJson(JsonNode addonsJson) { this.addonsJson = addonsJson; }

    public String getSucoPrep() { return sucoPrep; }
    public void setSucoPrep(String sucoPrep) { this.sucoPrep = sucoPrep; }

    public String getSucoSugar() { return sucoSugar; }
    public void setSucoSugar(String sucoSugar) { this.sucoSugar = sucoSugar; }
}
