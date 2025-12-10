--
-- PostgreSQL database dump
--

\restrict s9RcSKi52YFskjSzfQnaScNFGx9bE7QHmniT9TMETldGzztDfxwasrXRwI1TfdG

-- Dumped from database version 18.1
-- Dumped by pg_dump version 18.1

-- Started on 2025-12-10 00:56:01

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
-- TOC entry 227 (class 1255 OID 16666)
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
-- TOC entry 226 (class 1259 OID 16650)
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
-- TOC entry 225 (class 1259 OID 16649)
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
-- TOC entry 5010 (class 0 OID 0)
-- Dependencies: 225
-- Name: inventario_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.inventario_id_seq OWNED BY public.inventario.id;


--
-- TOC entry 224 (class 1259 OID 16630)
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
-- TOC entry 223 (class 1259 OID 16629)
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
-- TOC entry 5011 (class 0 OID 0)
-- Dependencies: 223
-- Name: productos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.productos_id_seq OWNED BY public.productos.id;


--
-- TOC entry 222 (class 1259 OID 16614)
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
-- TOC entry 221 (class 1259 OID 16613)
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
-- TOC entry 5012 (class 0 OID 0)
-- Dependencies: 221
-- Name: transacciones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.transacciones_id_seq OWNED BY public.transacciones.id;


--
-- TOC entry 220 (class 1259 OID 16561)
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
-- TOC entry 219 (class 1259 OID 16560)
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
-- TOC entry 5013 (class 0 OID 0)
-- Dependencies: 219
-- Name: usuarios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.usuarios_id_seq OWNED BY public.usuarios.id;


--
-- TOC entry 4831 (class 2604 OID 16653)
-- Name: inventario id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventario ALTER COLUMN id SET DEFAULT nextval('public.inventario_id_seq'::regclass);


--
-- TOC entry 4829 (class 2604 OID 16633)
-- Name: productos id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.productos ALTER COLUMN id SET DEFAULT nextval('public.productos_id_seq'::regclass);


--
-- TOC entry 4827 (class 2604 OID 16617)
-- Name: transacciones id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transacciones ALTER COLUMN id SET DEFAULT nextval('public.transacciones_id_seq'::regclass);


--
-- TOC entry 4825 (class 2604 OID 16564)
-- Name: usuarios id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios ALTER COLUMN id SET DEFAULT nextval('public.usuarios_id_seq'::regclass);


--
-- TOC entry 5004 (class 0 OID 16650)
-- Dependencies: 226
-- Data for Name: inventario; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.inventario (id, producto_id, cantidad, ultima_actualizacion) FROM stdin;
1	1	0	2025-12-09 23:41:00.247667-06
2	2	1	2025-12-09 23:51:26.511622-06
\.


--
-- TOC entry 5002 (class 0 OID 16630)
-- Dependencies: 224
-- Data for Name: productos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.productos (id, nombre, marca, descripcion, precio_venta, talla, color, codigo_barras, fecha_creacion) FROM stdin;
1	pantalon	levis	nuevo	150.00	32x34	azul	444551543613	2025-12-09 23:41:00.247667-06
2	television	sony	antigua	1500.00	n/a	gris	8532110051170411	2025-12-09 23:51:26.511622-06
\.


--
-- TOC entry 5000 (class 0 OID 16614)
-- Dependencies: 222
-- Data for Name: transacciones; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.transacciones (id, fecha_hora, tipo, usuario_id, total) FROM stdin;
\.


--
-- TOC entry 4998 (class 0 OID 16561)
-- Dependencies: 220
-- Data for Name: usuarios; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.usuarios (id, nombre, email, password_hash, rol) FROM stdin;
1	Rony	alberto.94071@gmail.com	$2b$10$yINQdhsUngTsm04UgWUGVOO266UM3HVYH7/xRXutlm0n6iR8TSNHq	admin
\.


--
-- TOC entry 5014 (class 0 OID 0)
-- Dependencies: 225
-- Name: inventario_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.inventario_id_seq', 2, true);


--
-- TOC entry 5015 (class 0 OID 0)
-- Dependencies: 223
-- Name: productos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.productos_id_seq', 2, true);


--
-- TOC entry 5016 (class 0 OID 0)
-- Dependencies: 221
-- Name: transacciones_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.transacciones_id_seq', 1, false);


--
-- TOC entry 5017 (class 0 OID 0)
-- Dependencies: 219
-- Name: usuarios_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.usuarios_id_seq', 1, true);


--
-- TOC entry 4846 (class 2606 OID 16660)
-- Name: inventario inventario_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventario
    ADD CONSTRAINT inventario_pkey PRIMARY KEY (id);


--
-- TOC entry 4842 (class 2606 OID 16647)
-- Name: productos productos_codigo_barras_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.productos
    ADD CONSTRAINT productos_codigo_barras_key UNIQUE (codigo_barras);


--
-- TOC entry 4844 (class 2606 OID 16645)
-- Name: productos productos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.productos
    ADD CONSTRAINT productos_pkey PRIMARY KEY (id);


--
-- TOC entry 4839 (class 2606 OID 16623)
-- Name: transacciones transacciones_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transacciones
    ADD CONSTRAINT transacciones_pkey PRIMARY KEY (id);


--
-- TOC entry 4835 (class 2606 OID 16576)
-- Name: usuarios usuarios_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_email_key UNIQUE (email);


--
-- TOC entry 4837 (class 2606 OID 16574)
-- Name: usuarios usuarios_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id);


--
-- TOC entry 4840 (class 1259 OID 16648)
-- Name: idx_codigo_barras; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_codigo_barras ON public.productos USING btree (codigo_barras);


--
-- TOC entry 4849 (class 2620 OID 16667)
-- Name: productos tr_inicializar_inventario; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER tr_inicializar_inventario AFTER INSERT ON public.productos FOR EACH ROW EXECUTE FUNCTION public.inicializar_inventario();


--
-- TOC entry 4848 (class 2606 OID 16661)
-- Name: inventario inventario_producto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventario
    ADD CONSTRAINT inventario_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id) ON DELETE CASCADE;


--
-- TOC entry 4847 (class 2606 OID 16624)
-- Name: transacciones transacciones_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transacciones
    ADD CONSTRAINT transacciones_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id);


-- Completed on 2025-12-10 00:56:03

--
-- PostgreSQL database dump complete
--

\unrestrict s9RcSKi52YFskjSzfQnaScNFGx9bE7QHmniT9TMETldGzztDfxwasrXRwI1TfdG

