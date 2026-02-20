package com.fruttz.backend.order.dto;

import java.util.List;

public class CreateOrderRequest {
    public Customer customer;
    public Delivery delivery;
    public List<Item> items;

    public Pricing pricing;
    public String notes;

    public static class Customer {
        public String name;
        public String phone;
        public String email;
        public String cpf;
    }

    public static class Delivery {
        public String method; // "DELIVERY" | "PICKUP"
        public String cep;
        public String addressLine;
        public String number;
        public String complement;
        public String neighborhood;
        public String city;
        public String state;
    }

    public static class Item {
        public String sku;
        public String name;
        public String category;
        public String size;
        public int quantity;

        public double unitPrice;
        public double total;

        public Object addons;
        public String sucoPrep;
        public String sucoSugar;
    }

    public static class Pricing {
        public double subtotal;
        public double shipping;
        public double total;
    }
}
