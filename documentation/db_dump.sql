--
-- PostgreSQL database dump
--

-- Dumped from database version 15.1
-- Dumped by pg_dump version 15.0

-- Started on 2023-01-01 21:17:10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 221 (class 1259 OID 133750)
-- Name: address; Type: TABLE; Schema: public; Owner: builder
--

CREATE TABLE public.address (
    address_id bigint NOT NULL,
    currency_id smallint,
    source_label_id smallint NOT NULL,
    address text NOT NULL,
    CONSTRAINT address_currency_id_check CHECK ((currency_id > 0)),
    CONSTRAINT address_source_label_id_check CHECK ((source_label_id > 0))
);


ALTER TABLE public.address OWNER TO builder;

--
-- TOC entry 220 (class 1259 OID 133749)
-- Name: address_address_id_seq; Type: SEQUENCE; Schema: public; Owner: builder
--

CREATE SEQUENCE public.address_address_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.address_address_id_seq OWNER TO builder;

--
-- TOC entry 3405 (class 0 OID 0)
-- Dependencies: 220
-- Name: address_address_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: builder
--

ALTER SEQUENCE public.address_address_id_seq OWNED BY public.address.address_id;


--
-- TOC entry 215 (class 1259 OID 133699)
-- Name: currency; Type: TABLE; Schema: public; Owner: builder
--

CREATE TABLE public.currency (
    currency_id smallint NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    logo text NOT NULL,
    blockchair_request_name text
);


ALTER TABLE public.currency OWNER TO builder;

--
-- TOC entry 214 (class 1259 OID 133698)
-- Name: currency_currency_id_seq; Type: SEQUENCE; Schema: public; Owner: builder
--

CREATE SEQUENCE public.currency_currency_id_seq
    AS smallint
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.currency_currency_id_seq OWNER TO builder;

--
-- TOC entry 3406 (class 0 OID 0)
-- Dependencies: 214
-- Name: currency_currency_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: builder
--

ALTER SEQUENCE public.currency_currency_id_seq OWNED BY public.currency.currency_id;


--
-- TOC entry 227 (class 1259 OID 133807)
-- Name: data; Type: TABLE; Schema: public; Owner: builder
--

CREATE TABLE public.data (
    data_id integer NOT NULL,
    source_label_url_id smallint NOT NULL,
    url_id smallint NOT NULL,
    roles smallint[] NOT NULL,
    path text NOT NULL,
    crawled_at timestamp without time zone,
    CONSTRAINT data_source_label_url_id_check CHECK ((source_label_url_id > 0)),
    CONSTRAINT data_url_id_check CHECK ((url_id > 0))
);


ALTER TABLE public.data OWNER TO builder;

--
-- TOC entry 226 (class 1259 OID 133806)
-- Name: data_data_id_seq; Type: SEQUENCE; Schema: public; Owner: builder
--

CREATE SEQUENCE public.data_data_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.data_data_id_seq OWNER TO builder;

--
-- TOC entry 3407 (class 0 OID 0)
-- Dependencies: 226
-- Name: data_data_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: builder
--

ALTER SEQUENCE public.data_data_id_seq OWNED BY public.data.data_id;


--
-- TOC entry 217 (class 1259 OID 133716)
-- Name: source; Type: TABLE; Schema: public; Owner: builder
--

CREATE TABLE public.source (
    source_id smallint NOT NULL,
    roles smallint[] NOT NULL,
    name text NOT NULL
);


ALTER TABLE public.source OWNER TO builder;

--
-- TOC entry 219 (class 1259 OID 133727)
-- Name: source_label; Type: TABLE; Schema: public; Owner: builder
--

CREATE TABLE public.source_label (
    source_label_id smallint NOT NULL,
    source_id smallint NOT NULL,
    new_addresses_currency_id bigint,
    roles smallint[] NOT NULL,
    name text NOT NULL,
    CONSTRAINT source_label_new_addresses_currency_id_check CHECK ((new_addresses_currency_id > 0)),
    CONSTRAINT source_label_source_id_check CHECK ((source_id > 0))
);


ALTER TABLE public.source_label OWNER TO builder;

--
-- TOC entry 218 (class 1259 OID 133726)
-- Name: source_label_source_label_id_seq; Type: SEQUENCE; Schema: public; Owner: builder
--

CREATE SEQUENCE public.source_label_source_label_id_seq
    AS smallint
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.source_label_source_label_id_seq OWNER TO builder;

--
-- TOC entry 3408 (class 0 OID 0)
-- Dependencies: 218
-- Name: source_label_source_label_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: builder
--

ALTER SEQUENCE public.source_label_source_label_id_seq OWNED BY public.source_label.source_label_id;


--
-- TOC entry 225 (class 1259 OID 133784)
-- Name: source_label_url; Type: TABLE; Schema: public; Owner: builder
--

CREATE TABLE public.source_label_url (
    source_label_url_id smallint NOT NULL,
    source_label_id smallint NOT NULL,
    url_id smallint NOT NULL,
    roles smallint[] NOT NULL,
    last_crawled_at timestamp without time zone,
    CONSTRAINT source_label_url_source_label_id_check CHECK ((source_label_id > 0)),
    CONSTRAINT source_label_url_url_id_check CHECK ((url_id > 0))
);


ALTER TABLE public.source_label_url OWNER TO builder;

--
-- TOC entry 224 (class 1259 OID 133783)
-- Name: source_label_url_source_label_url_id_seq; Type: SEQUENCE; Schema: public; Owner: builder
--

CREATE SEQUENCE public.source_label_url_source_label_url_id_seq
    AS smallint
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.source_label_url_source_label_url_id_seq OWNER TO builder;

--
-- TOC entry 3409 (class 0 OID 0)
-- Dependencies: 224
-- Name: source_label_url_source_label_url_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: builder
--

ALTER SEQUENCE public.source_label_url_source_label_url_id_seq OWNED BY public.source_label_url.source_label_url_id;


--
-- TOC entry 216 (class 1259 OID 133715)
-- Name: source_source_id_seq; Type: SEQUENCE; Schema: public; Owner: builder
--

CREATE SEQUENCE public.source_source_id_seq
    AS smallint
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.source_source_id_seq OWNER TO builder;

--
-- TOC entry 3410 (class 0 OID 0)
-- Dependencies: 216
-- Name: source_source_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: builder
--

ALTER SEQUENCE public.source_source_id_seq OWNED BY public.source.source_id;


--
-- TOC entry 223 (class 1259 OID 133773)
-- Name: url; Type: TABLE; Schema: public; Owner: builder
--

CREATE TABLE public.url (
    url_id integer NOT NULL,
    address text NOT NULL
);


ALTER TABLE public.url OWNER TO builder;

--
-- TOC entry 222 (class 1259 OID 133772)
-- Name: url_url_id_seq; Type: SEQUENCE; Schema: public; Owner: builder
--

CREATE SEQUENCE public.url_url_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.url_url_id_seq OWNER TO builder;

--
-- TOC entry 3411 (class 0 OID 0)
-- Dependencies: 222
-- Name: url_url_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: builder
--

ALTER SEQUENCE public.url_url_id_seq OWNED BY public.url.url_id;


--
-- TOC entry 3206 (class 2604 OID 133753)
-- Name: address address_id; Type: DEFAULT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.address ALTER COLUMN address_id SET DEFAULT nextval('public.address_address_id_seq'::regclass);


--
-- TOC entry 3203 (class 2604 OID 133702)
-- Name: currency currency_id; Type: DEFAULT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.currency ALTER COLUMN currency_id SET DEFAULT nextval('public.currency_currency_id_seq'::regclass);


--
-- TOC entry 3209 (class 2604 OID 133810)
-- Name: data data_id; Type: DEFAULT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.data ALTER COLUMN data_id SET DEFAULT nextval('public.data_data_id_seq'::regclass);


--
-- TOC entry 3204 (class 2604 OID 133719)
-- Name: source source_id; Type: DEFAULT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.source ALTER COLUMN source_id SET DEFAULT nextval('public.source_source_id_seq'::regclass);


--
-- TOC entry 3205 (class 2604 OID 133730)
-- Name: source_label source_label_id; Type: DEFAULT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.source_label ALTER COLUMN source_label_id SET DEFAULT nextval('public.source_label_source_label_id_seq'::regclass);


--
-- TOC entry 3208 (class 2604 OID 133787)
-- Name: source_label_url source_label_url_id; Type: DEFAULT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.source_label_url ALTER COLUMN source_label_url_id SET DEFAULT nextval('public.source_label_url_source_label_url_id_seq'::regclass);


--
-- TOC entry 3207 (class 2604 OID 133776)
-- Name: url url_id; Type: DEFAULT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.url ALTER COLUMN url_id SET DEFAULT nextval('public.url_url_id_seq'::regclass);


--
-- TOC entry 3237 (class 2606 OID 133759)
-- Name: address address_address_id_pkey; Type: CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.address
    ADD CONSTRAINT address_address_id_pkey PRIMARY KEY (address_id);


--
-- TOC entry 3239 (class 2606 OID 133761)
-- Name: address address_address_key; Type: CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.address
    ADD CONSTRAINT address_address_key UNIQUE (address);


--
-- TOC entry 3219 (class 2606 OID 133714)
-- Name: currency blockchair_request_name_key; Type: CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.currency
    ADD CONSTRAINT blockchair_request_name_key UNIQUE (blockchair_request_name);


--
-- TOC entry 3221 (class 2606 OID 133710)
-- Name: currency currency_code_key; Type: CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.currency
    ADD CONSTRAINT currency_code_key UNIQUE (code);


--
-- TOC entry 3223 (class 2606 OID 133706)
-- Name: currency currency_currency_id_pkey; Type: CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.currency
    ADD CONSTRAINT currency_currency_id_pkey PRIMARY KEY (currency_id);


--
-- TOC entry 3225 (class 2606 OID 133712)
-- Name: currency currency_logo_key; Type: CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.currency
    ADD CONSTRAINT currency_logo_key UNIQUE (logo);


--
-- TOC entry 3227 (class 2606 OID 133708)
-- Name: currency currency_name_key; Type: CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.currency
    ADD CONSTRAINT currency_name_key UNIQUE (name);


--
-- TOC entry 3249 (class 2606 OID 133816)
-- Name: data data_data_id_pkey; Type: CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.data
    ADD CONSTRAINT data_data_id_pkey PRIMARY KEY (data_id);


--
-- TOC entry 3233 (class 2606 OID 133738)
-- Name: source_label source_label_source_id_name_key; Type: CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.source_label
    ADD CONSTRAINT source_label_source_id_name_key UNIQUE (source_id, name);


--
-- TOC entry 3235 (class 2606 OID 133736)
-- Name: source_label source_label_source_label_id_pkey; Type: CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.source_label
    ADD CONSTRAINT source_label_source_label_id_pkey PRIMARY KEY (source_label_id);


--
-- TOC entry 3245 (class 2606 OID 133793)
-- Name: source_label_url source_label_url_id_pkey; Type: CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.source_label_url
    ADD CONSTRAINT source_label_url_id_pkey PRIMARY KEY (source_label_url_id);


--
-- TOC entry 3247 (class 2606 OID 133795)
-- Name: source_label_url source_label_url_source_label_id_url_id_key; Type: CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.source_label_url
    ADD CONSTRAINT source_label_url_source_label_id_url_id_key UNIQUE (source_label_id, url_id);


--
-- TOC entry 3229 (class 2606 OID 133725)
-- Name: source source_name_key; Type: CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.source
    ADD CONSTRAINT source_name_key UNIQUE (name);


--
-- TOC entry 3231 (class 2606 OID 133723)
-- Name: source source_source_id_pkey; Type: CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.source
    ADD CONSTRAINT source_source_id_pkey PRIMARY KEY (source_id);


--
-- TOC entry 3241 (class 2606 OID 133782)
-- Name: url url_address_key; Type: CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.url
    ADD CONSTRAINT url_address_key UNIQUE (address);


--
-- TOC entry 3243 (class 2606 OID 133780)
-- Name: url url_url_id_pkey; Type: CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.url
    ADD CONSTRAINT url_url_id_pkey PRIMARY KEY (url_id);


--
-- TOC entry 3252 (class 2606 OID 133762)
-- Name: address address_currency_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.address
    ADD CONSTRAINT address_currency_id_fkey FOREIGN KEY (currency_id) REFERENCES public.currency(currency_id);


--
-- TOC entry 3253 (class 2606 OID 133767)
-- Name: address address_source_label_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.address
    ADD CONSTRAINT address_source_label_id_fkey FOREIGN KEY (source_label_id) REFERENCES public.source_label(source_label_id);


--
-- TOC entry 3256 (class 2606 OID 133817)
-- Name: data data_source_label_url_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.data
    ADD CONSTRAINT data_source_label_url_id_fkey FOREIGN KEY (source_label_url_id) REFERENCES public.source_label_url(source_label_url_id);


--
-- TOC entry 3257 (class 2606 OID 133822)
-- Name: data data_url_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.data
    ADD CONSTRAINT data_url_id_fkey FOREIGN KEY (url_id) REFERENCES public.url(url_id);


--
-- TOC entry 3250 (class 2606 OID 133744)
-- Name: source_label source_label_new_addresses_currency_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.source_label
    ADD CONSTRAINT source_label_new_addresses_currency_id_fkey FOREIGN KEY (new_addresses_currency_id) REFERENCES public.currency(currency_id);


--
-- TOC entry 3251 (class 2606 OID 133739)
-- Name: source_label source_label_source_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.source_label
    ADD CONSTRAINT source_label_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.source(source_id);


--
-- TOC entry 3254 (class 2606 OID 133796)
-- Name: source_label_url source_label_url_source_label_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.source_label_url
    ADD CONSTRAINT source_label_url_source_label_id_fkey FOREIGN KEY (source_label_id) REFERENCES public.source_label(source_label_id);


--
-- TOC entry 3255 (class 2606 OID 133801)
-- Name: source_label_url source_label_url_url_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.source_label_url
    ADD CONSTRAINT source_label_url_url_id_fkey FOREIGN KEY (url_id) REFERENCES public.url(url_id);


-- Completed on 2023-01-01 21:17:10

--
-- PostgreSQL database dump complete
--

