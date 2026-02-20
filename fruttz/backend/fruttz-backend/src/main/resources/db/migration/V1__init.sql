create table if not exists orders (
  id uuid primary key,
  order_date date not null,
  daily_seq int not null,
  order_number varchar(40) not null unique,

  status varchar(40) not null,

  subtotal numeric(12,2) not null,
  shipping numeric(12,2) not null,
  total numeric(12,2) not null,

  customer_name varchar(120),
  customer_phone varchar(40),

  delivery_cep varchar(16),
  delivery_address_line varchar(200),
  delivery_number varchar(40),
  delivery_complement varchar(120),
  delivery_neighborhood varchar(120),
  delivery_city varchar(120),
  delivery_state varchar(8),

  txid varchar(80),
  pix_copy_paste text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists ux_orders_date_seq on orders(order_date, daily_seq);

create table if not exists order_items (
  id uuid primary key,
  order_id uuid not null references orders(id) on delete cascade,
  sku varchar(80),
  name varchar(160) not null,
  category varchar(80),
  size varchar(40),

  quantity int not null,
  unit_price numeric(12,2) not null,
  total numeric(12,2) not null,

  addons_json jsonb,
  suco_prep varchar(60),
  suco_sugar varchar(60)
);

-- updated_at automático
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_orders_updated_at on orders;
create trigger trg_orders_updated_at
before update on orders
for each row execute function set_updated_at();
