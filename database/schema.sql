create table Users(user_id int auto_increment primary key, name varchar(120) not null, email varchar(120) unique not null, password_hash varchar(255) not null, role varchar(20) not null default 'Staff');

create table Suppliers(supplier_id int auto_increment primary key, name varchar(120) not null,phone varchar(20), email varchar(120));

create table Products(product_id int auto_increment primary key, name varchar(120) not null, category varchar(80), price decimal(10,2) not null, quantity int not null default 0, low_stock_threshold int 
not null default 5, supplier_id int, foreign key(supplied_id) references Suppliers(supplier_id));

create table Sales(sale_id int auto_increment primary key, date timestamp not null default current_timestamp, total_amount decimal(10,2) not null default 0, user_id int, foreign key(user_id) references 
Users(user_id));

create table Sale_Items(sale_item_id int auto_increment primary key, sale_id int not null, product_id int not null, quantity int not null, price decimal(10,2) not null, foreign key(sale_id) references
Sales(sale_id) on delete cascade, foreign key(product_id) references Products(product_id));

