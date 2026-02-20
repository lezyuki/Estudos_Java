package com.fruttz.backend.order.dto;

import com.fruttz.backend.order.OrderStatus;

import java.time.Instant;
import java.util.List;

public class OrderResponse {
    public String id;
    public OrderStatus status;
    public Instant createdAt;

    public CreateOrderRequest.Customer customer;
    public CreateOrderRequest.Delivery delivery;
    public List<CreateOrderRequest.Item> items;
    public CreateOrderRequest.Pricing pricing;

    public String paymentMethod; // "PIX" etc
}
