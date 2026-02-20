package com.fruttz.backend.order;

public enum OrderStatus {
    CREATED,
    WAITING_PAYMENT,
    PAID,
    PREPARING,
    OUT_FOR_DELIVERY,
    DELIVERED,
    CANCELED
}
