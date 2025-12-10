--
-- PostgreSQL database dump
--

\restrict MX7zeIC41FXO6E877TOf5G2Tecf5XOff1nP5H19HEIFfG8ilQaE4NcjQ9KZUyuZ

-- Dumped from database version 18.1
-- Dumped by pg_dump version 18.1

-- Started on 2025-12-10 17:38:54

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 231 (class 1255 OID 16460)
-- Name: inicializar_inventario(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.inicializar_inventario() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    INSERT INTO inventario (producto_id, cantidad)
    VALUES (NEW.id, 0);
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.inicializar_inventario() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 228 (class 1259 OID 24652)
-- Name: historial_ventas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.historial_ventas (
    id integer NOT NULL,
    producto_id integer,
    cantidad integer NOT NULL,
    precio_unitario numeric(10,2) NOT NULL,
    total_venta numeric(10,2) NOT NULL,
    fecha_venta timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    user_id integer
);


ALTER TABLE public.historial_ventas OWNER TO postgres;

--
-- TOC entry 227 (class 1259 OID 24651)
-- Name: historial_ventas_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.historial_ventas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.historial_ventas_id_seq OWNER TO postgres;

--
-- TOC entry 5082 (class 0 OID 0)
-- Dependencies: 227
-- Name: historial_ventas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.historial_ventas_id_seq OWNED BY public.historial_ventas.id;


--
-- TOC entry 219 (class 1259 OID 16461)
-- Name: inventario; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.inventario (
    id integer NOT NULL,
    producto_id integer NOT NULL,
    cantidad integer DEFAULT 0 NOT NULL,
    ultima_actualizacion timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.inventario OWNER TO postgres;

--
-- TOC entry 220 (class 1259 OID 16469)
-- Name: inventario_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.inventario_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.inventario_id_seq OWNER TO postgres;

--
-- TOC entry 5083 (class 0 OID 0)
-- Dependencies: 220
-- Name: inventario_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.inventario_id_seq OWNED BY public.inventario.id;


--
-- TOC entry 230 (class 1259 OID 24686)
-- Name: log_actividad; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.log_actividad (
    id integer NOT NULL,
    user_id integer,
    username character varying(100) NOT NULL,
    rol character varying(50) NOT NULL,
    accion character varying(255) NOT NULL,
    entidad_afectada character varying(100),
    fecha_registro timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.log_actividad OWNER TO postgres;

--
-- TOC entry 229 (class 1259 OID 24685)
-- Name: log_actividad_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.log_actividad_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.log_actividad_id_seq OWNER TO postgres;

--
-- TOC entry 5084 (class 0 OID 0)
-- Dependencies: 229
-- Name: log_actividad_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.log_actividad_id_seq OWNED BY public.log_actividad.id;


--
-- TOC entry 221 (class 1259 OID 16470)
-- Name: productos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.productos (
    id integer NOT NULL,
    nombre character varying(255) NOT NULL,
    marca character varying(100) NOT NULL,
    descripcion text,
    precio_venta numeric(10,2) NOT NULL,
    talla character varying(20) NOT NULL,
    color character varying(50) NOT NULL,
    codigo_barras character varying(100) NOT NULL,
    fecha_creacion timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.productos OWNER TO postgres;

--
-- TOC entry 222 (class 1259 OID 16483)
-- Name: productos_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.productos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.productos_id_seq OWNER TO postgres;

--
-- TOC entry 5085 (class 0 OID 0)
-- Dependencies: 222
-- Name: productos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.productos_id_seq OWNED BY public.productos.id;


--
-- TOC entry 223 (class 1259 OID 16484)
-- Name: transacciones; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.transacciones (
    id integer NOT NULL,
    fecha_hora timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    tipo character varying(10) NOT NULL,
    usuario_id integer,
    total numeric(10,2) NOT NULL
);


ALTER TABLE public.transacciones OWNER TO postgres;

--
-- TOC entry 224 (class 1259 OID 16491)
-- Name: transacciones_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.transacciones_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.transacciones_id_seq OWNER TO postgres;

--
-- TOC entry 5086 (class 0 OID 0)
-- Dependencies: 224
-- Name: transacciones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.transacciones_id_seq OWNED BY public.transacciones.id;


--
-- TOC entry 225 (class 1259 OID 16492)
-- Name: usuarios; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.usuarios (
    id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    email character varying(100) NOT NULL,
    password_hash character varying(255) NOT NULL,
    rol character varying(50) DEFAULT 'empleado'::character varying NOT NULL
);


ALTER TABLE public.usuarios OWNER TO postgres;

--
-- TOC entry 226 (class 1259 OID 16503)
-- Name: usuarios_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.usuarios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.usuarios_id_seq OWNER TO postgres;

--
-- TOC entry 5087 (class 0 OID 0)
-- Dependencies: 226
-- Name: usuarios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.usuarios_id_seq OWNED BY public.usuarios.id;


--
-- TOC entry 4891 (class 2604 OID 24655)
-- Name: historial_ventas id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.historial_ventas ALTER COLUMN id SET DEFAULT nextval('public.historial_ventas_id_seq'::regclass);


--
-- TOC entry 4882 (class 2604 OID 16504)
-- Name: inventario id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventario ALTER COLUMN id SET DEFAULT nextval('public.inventario_id_seq'::regclass);


--
-- TOC entry 4893 (class 2604 OID 24689)
-- Name: log_actividad id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.log_actividad ALTER COLUMN id SET DEFAULT nextval('public.log_actividad_id_seq'::regclass);


--
-- TOC entry 4885 (class 2604 OID 16505)
-- Name: productos id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.productos ALTER COLUMN id SET DEFAULT nextval('public.productos_id_seq'::regclass);


--
-- TOC entry 4887 (class 2604 OID 16506)
-- Name: transacciones id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transacciones ALTER COLUMN id SET DEFAULT nextval('public.transacciones_id_seq'::regclass);


--
-- TOC entry 4889 (class 2604 OID 16507)
-- Name: usuarios id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios ALTER COLUMN id SET DEFAULT nextval('public.usuarios_id_seq'::regclass);


--
-- TOC entry 5074 (class 0 OID 24652)
-- Dependencies: 228
-- Data for Name: historial_ventas; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.historial_ventas (id, producto_id, cantidad, precio_unitario, total_venta, fecha_venta, user_id) FROM stdin;
1	2	2	1500.00	3000.00	2025-12-10 09:54:25.123767-06	\N
2	4	2	50.00	100.00	2025-12-10 09:54:25.15485-06	\N
3	5	1	6.00	6.00	2025-12-10 10:00:37.502769-06	\N
4	6	1	10.00	10.00	2025-12-10 10:00:37.51554-06	\N
5	5	1	6.00	6.00	2025-12-10 10:58:47.483613-06	\N
6	6	1	10.00	10.00	2025-12-10 11:02:33.539586-06	\N
7	6	1	10.00	10.00	2025-12-10 11:11:10.961254-06	\N
8	6	1	10.00	10.00	2025-12-10 11:11:37.237645-06	\N
9	5	1	6.00	6.00	2025-12-10 11:11:37.247352-06	\N
10	6	1	10.00	10.00	2025-12-10 11:19:05.163062-06	\N
11	5	2	6.00	12.00	2025-12-10 11:19:05.175825-06	\N
12	6	2	10.00	20.00	2025-12-10 11:20:33.459723-06	\N
13	6	2	10.00	20.00	2025-12-10 11:22:39.176861-06	\N
14	6	1	10.00	10.00	2025-12-10 11:30:14.774365-06	\N
15	6	1	10.00	10.00	2025-12-10 11:33:45.966022-06	\N
16	5	1	6.00	6.00	2025-12-10 11:33:45.989669-06	\N
17	6	1	10.00	10.00	2025-12-10 11:36:26.714358-06	\N
18	6	1	10.00	10.00	2025-12-10 11:37:46.553368-06	\N
19	6	1	10.00	10.00	2025-12-10 11:41:53.525004-06	\N
20	5	2	6.00	12.00	2025-12-10 11:48:32.741572-06	\N
21	5	1	6.00	6.00	2025-12-10 12:05:01.930672-06	\N
22	5	1	6.00	6.00	2025-12-10 12:09:47.093706-06	\N
23	5	1	6.00	6.00	2025-12-10 12:25:48.290474-06	\N
24	5	1	6.00	6.00	2025-12-10 12:52:42.171383-06	\N
25	7	1	35.00	35.00	2025-12-10 12:55:46.308413-06	\N
26	7	1	35.00	35.00	2025-12-10 13:10:53.963841-06	1
27	7	1	35.00	35.00	2025-12-10 13:20:25.132852-06	\N
28	7	1	35.00	35.00	2025-12-10 13:26:02.827858-06	1
29	7	1	35.00	35.00	2025-12-10 13:35:25.784685-06	1
30	7	1	35.00	35.00	2025-12-10 13:51:04.170169-06	1
\.


--
-- TOC entry 5065 (class 0 OID 16461)
-- Dependencies: 219
-- Data for Name: inventario; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.inventario (id, producto_id, cantidad, ultima_actualizacion) FROM stdin;
1	1	0	2025-12-09 23:41:00.247667-06
5	5	0	2025-12-10 09:55:57.263864-06
3	3	1	2025-12-10 08:31:42.089085-06
7	7	0	2025-12-10 12:53:54.223613-06
2	2	0	2025-12-09 23:51:26.511622-06
4	4	2	2025-12-10 08:32:23.580368-06
6	6	0	2025-12-10 09:57:46.071141-06
\.


--
-- TOC entry 5076 (class 0 OID 24686)
-- Dependencies: 230
-- Data for Name: log_actividad; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.log_actividad (id, user_id, username, rol, accion, entidad_afectada, fecha_registro) FROM stdin;
1	1	Rony	admin	Creación de Nuevo Producto	productos	2025-12-10 12:53:54.215165-06
\.


--
-- TOC entry 5067 (class 0 OID 16470)
-- Dependencies: 221
-- Data for Name: productos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.productos (id, nombre, marca, descripcion, precio_venta, talla, color, codigo_barras, fecha_creacion) FROM stdin;
1	pantalon	levis	nuevo	150.00	32x34	azul	444551543613	2025-12-09 23:41:00.247667-06
2	television	sony	antigua	1500.00	n/a	gris	8532110051170411	2025-12-09 23:51:26.511622-06
3	camisa	nike	algodon	75.00	XL	negro	SC#10BT	2025-12-10 08:31:42.089085-06
4	camisa	adidas	kjasdnkds	50.00	M	rojo	SC310BT	2025-12-10 08:32:23.580368-06
5	energizante	raptor	lata	6.00	n/a	gris con rojo	7406189003741	2025-12-10 09:55:57.263864-06
6	fritura	tortrix	taco	10.00	n/a	salsa	721282201182	2025-12-10 09:57:46.071141-06
7	CUENTAFACIL	AZOR	PASTA	35.00	.	TRANSPARENTE	7501428709269	2025-12-10 12:53:54.223613-06
\.


--
-- TOC entry 5069 (class 0 OID 16484)
-- Dependencies: 223
-- Data for Name: transacciones; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.transacciones (id, fecha_hora, tipo, usuario_id, total) FROM stdin;
\.


--
-- TOC entry 5071 (class 0 OID 16492)
-- Dependencies: 225
-- Data for Name: usuarios; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.usuarios (id, nombre, email, password_hash, rol) FROM stdin;
1	Rony	alberto.94071@gmail.com	$2b$10$yINQdhsUngTsm04UgWUGVOO266UM3HVYH7/xRXutlm0n6iR8TSNHq	admin
2	alberto	beto@gmail.com	$2b$10$1qPP/vU1th7LDMswqt8CdOdb8hcvAU/TNpJC0MHOmRc4kfFoHeDvm	cajero
\.


--
-- TOC entry 5088 (class 0 OID 0)
-- Dependencies: 227
-- Name: historial_ventas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.historial_ventas_id_seq', 30, true);


--
-- TOC entry 5089 (class 0 OID 0)
-- Dependencies: 220
-- Name: inventario_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.inventario_id_seq', 7, true);


--
-- TOC entry 5090 (class 0 OID 0)
-- Dependencies: 229
-- Name: log_actividad_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.log_actividad_id_seq', 1, true);


--
-- TOC entry 5091 (class 0 OID 0)
-- Dependencies: 222
-- Name: productos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.productos_id_seq', 7, true);


--
-- TOC entry 5092 (class 0 OID 0)
-- Dependencies: 224
-- Name: transacciones_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.transacciones_id_seq', 1, false);


--
-- TOC entry 5093 (class 0 OID 0)
-- Dependencies: 226
-- Name: usuarios_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.usuarios_id_seq', 2, true);


--
-- TOC entry 4909 (class 2606 OID 24662)
-- Name: historial_ventas historial_ventas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.historial_ventas
    ADD CONSTRAINT historial_ventas_pkey PRIMARY KEY (id);


--
-- TOC entry 4896 (class 2606 OID 16509)
-- Name: inventario inventario_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventario
    ADD CONSTRAINT inventario_pkey PRIMARY KEY (id);


--
-- TOC entry 4911 (class 2606 OID 24698)
-- Name: log_actividad log_actividad_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.log_actividad
    ADD CONSTRAINT log_actividad_pkey PRIMARY KEY (id);


--
-- TOC entry 4899 (class 2606 OID 16511)
-- Name: productos productos_codigo_barras_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.productos
    ADD CONSTRAINT productos_codigo_barras_key UNIQUE (codigo_barras);


--
-- TOC entry 4901 (class 2606 OID 16513)
-- Name: productos productos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.productos
    ADD CONSTRAINT productos_pkey PRIMARY KEY (id);


--
-- TOC entry 4903 (class 2606 OID 16515)
-- Name: transacciones transacciones_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transacciones
    ADD CONSTRAINT transacciones_pkey PRIMARY KEY (id);


--
-- TOC entry 4905 (class 2606 OID 16517)
-- Name: usuarios usuarios_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_email_key UNIQUE (email);


--
-- TOC entry 4907 (class 2606 OID 16519)
-- Name: usuarios usuarios_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id);


--
-- TOC entry 4897 (class 1259 OID 16520)
-- Name: idx_codigo_barras; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_codigo_barras ON public.productos USING btree (codigo_barras);


--
-- TOC entry 4917 (class 2620 OID 16521)
-- Name: productos tr_inicializar_inventario; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER tr_inicializar_inventario AFTER INSERT ON public.productos FOR EACH ROW EXECUTE FUNCTION public.inicializar_inventario();


--
-- TOC entry 4914 (class 2606 OID 24663)
-- Name: historial_ventas historial_ventas_producto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.historial_ventas
    ADD CONSTRAINT historial_ventas_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id);


--
-- TOC entry 4915 (class 2606 OID 24704)
-- Name: historial_ventas historial_ventas_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.historial_ventas
    ADD CONSTRAINT historial_ventas_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.usuarios(id);


--
-- TOC entry 4912 (class 2606 OID 16522)
-- Name: inventario inventario_producto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventario
    ADD CONSTRAINT inventario_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id) ON DELETE CASCADE;


--
-- TOC entry 4916 (class 2606 OID 24699)
-- Name: log_actividad log_actividad_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.log_actividad
    ADD CONSTRAINT log_actividad_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.usuarios(id);


--
-- TOC entry 4913 (class 2606 OID 16527)
-- Name: transacciones transacciones_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transacciones
    ADD CONSTRAINT transacciones_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id);


-- Completed on 2025-12-10 17:38:54

--
-- PostgreSQL database dump complete
--

\unrestrict MX7zeIC41FXO6E877TOf5G2Tecf5XOff1nP5H19HEIFfG8ilQaE4NcjQ9KZUyuZ

