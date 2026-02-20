package com.fruttz.backend.controller;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.core.io.ClassPathResource;
import org.springframework.web.bind.annotation.*;

import java.io.InputStream;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/products")
@CrossOrigin(origins = "*")
public class ProductController {

    private final ObjectMapper mapper = new ObjectMapper();

    @GetMapping
    public List<Map<String, Object>> list() throws Exception {
        ClassPathResource resource = new ClassPathResource("products.json");
        try (InputStream in = resource.getInputStream()) {
            return mapper.readValue(in, new TypeReference<List<Map<String, Object>>>() {});
        }
    }
}
