package com.fruttz.backend.order;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface OrderRepository extends JpaRepository<OrderEntity, UUID> {

    @Query("select coalesce(max(o.dailySeq), 0) from OrderEntity o where o.orderDate = :date")
    int findMaxDailySeq(@Param("date") LocalDate date);

    // ✅ busca pedido já trazendo items (evita LazyInitialization)
    @Query("""
        select distinct o
        from OrderEntity o
        left join fetch o.items
        where o.id = :id
    """)
    Optional<OrderEntity> findByIdWithItems(@Param("id") UUID id);

    // ✅ lista todos já trazendo items (use se você quiser items no /api/orders)
    @Query("""
        select distinct o
        from OrderEntity o
        left join fetch o.items
        order by o.orderDate desc, o.dailySeq desc
    """)
    List<OrderEntity> findAllWithItems();
}
