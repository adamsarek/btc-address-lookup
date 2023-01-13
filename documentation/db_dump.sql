--
-- PostgreSQL database dump
--

-- Dumped from database version 15.1
-- Dumped by pg_dump version 15.0

-- Started on 2023-01-13 03:50:37

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
-- TOC entry 223 (class 1259 OID 186374)
-- Name: address; Type: TABLE; Schema: public; Owner: builder
--

CREATE TABLE public.address (
    address_id bigint NOT NULL,
    currency_id smallint,
    source_label_id smallint NOT NULL,
    roles smallint[] DEFAULT ARRAY[]::smallint[] NOT NULL,
    address text NOT NULL,
    CONSTRAINT address_currency_id_check CHECK ((currency_id > 0)),
    CONSTRAINT address_source_label_id_check CHECK ((source_label_id > 0))
);


ALTER TABLE public.address OWNER TO builder;

--
-- TOC entry 222 (class 1259 OID 186373)
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
-- TOC entry 3432 (class 0 OID 0)
-- Dependencies: 222
-- Name: address_address_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: builder
--

ALTER SEQUENCE public.address_address_id_seq OWNED BY public.address.address_id;


--
-- TOC entry 231 (class 1259 OID 186455)
-- Name: address_data; Type: TABLE; Schema: public; Owner: builder
--

CREATE TABLE public.address_data (
    address_data_id bigint NOT NULL,
    address_id bigint NOT NULL,
    data_id bigint NOT NULL,
    CONSTRAINT address_data_address_id_check CHECK ((address_id > 0)),
    CONSTRAINT address_data_data_id_check CHECK ((data_id > 0))
);


ALTER TABLE public.address_data OWNER TO builder;

--
-- TOC entry 230 (class 1259 OID 186454)
-- Name: address_data_address_data_id_seq; Type: SEQUENCE; Schema: public; Owner: builder
--

CREATE SEQUENCE public.address_data_address_data_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.address_data_address_data_id_seq OWNER TO builder;

--
-- TOC entry 3433 (class 0 OID 0)
-- Dependencies: 230
-- Name: address_data_address_data_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: builder
--

ALTER SEQUENCE public.address_data_address_data_id_seq OWNED BY public.address_data.address_data_id;


--
-- TOC entry 217 (class 1259 OID 186322)
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
-- TOC entry 216 (class 1259 OID 186321)
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
-- TOC entry 3434 (class 0 OID 0)
-- Dependencies: 216
-- Name: currency_currency_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: builder
--

ALTER SEQUENCE public.currency_currency_id_seq OWNED BY public.currency.currency_id;


--
-- TOC entry 229 (class 1259 OID 186433)
-- Name: data; Type: TABLE; Schema: public; Owner: builder
--

CREATE TABLE public.data (
    data_id bigint NOT NULL,
    source_label_url_id smallint NOT NULL,
    url_id bigint NOT NULL,
    roles smallint[] DEFAULT ARRAY[]::smallint[] NOT NULL,
    path text NOT NULL,
    crawled_at timestamp without time zone,
    CONSTRAINT data_source_label_url_id_check CHECK ((source_label_url_id > 0)),
    CONSTRAINT data_url_id_check CHECK ((url_id > 0))
);


ALTER TABLE public.data OWNER TO builder;

--
-- TOC entry 228 (class 1259 OID 186432)
-- Name: data_data_id_seq; Type: SEQUENCE; Schema: public; Owner: builder
--

CREATE SEQUENCE public.data_data_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.data_data_id_seq OWNER TO builder;

--
-- TOC entry 3435 (class 0 OID 0)
-- Dependencies: 228
-- Name: data_data_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: builder
--

ALTER SEQUENCE public.data_data_id_seq OWNED BY public.data.data_id;


--
-- TOC entry 219 (class 1259 OID 186339)
-- Name: role; Type: TABLE; Schema: public; Owner: builder
--

CREATE TABLE public.role (
    role_id smallint NOT NULL,
    name text NOT NULL
);


ALTER TABLE public.role OWNER TO builder;

--
-- TOC entry 218 (class 1259 OID 186338)
-- Name: role_role_id_seq; Type: SEQUENCE; Schema: public; Owner: builder
--

CREATE SEQUENCE public.role_role_id_seq
    AS smallint
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.role_role_id_seq OWNER TO builder;

--
-- TOC entry 3436 (class 0 OID 0)
-- Dependencies: 218
-- Name: role_role_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: builder
--

ALTER SEQUENCE public.role_role_id_seq OWNED BY public.role.role_id;


--
-- TOC entry 215 (class 1259 OID 186310)
-- Name: source; Type: TABLE; Schema: public; Owner: builder
--

CREATE TABLE public.source (
    source_id smallint NOT NULL,
    roles smallint[] DEFAULT ARRAY[]::smallint[] NOT NULL,
    name text NOT NULL
);


ALTER TABLE public.source OWNER TO builder;

--
-- TOC entry 221 (class 1259 OID 186350)
-- Name: source_label; Type: TABLE; Schema: public; Owner: builder
--

CREATE TABLE public.source_label (
    source_label_id smallint NOT NULL,
    source_id smallint NOT NULL,
    new_addresses_currency_id smallint,
    roles smallint[] DEFAULT ARRAY[]::smallint[] NOT NULL,
    search_data_by_address boolean NOT NULL,
    name text NOT NULL,
    CONSTRAINT source_label_new_addresses_currency_id_check CHECK ((new_addresses_currency_id > 0)),
    CONSTRAINT source_label_source_id_check CHECK ((source_id > 0))
);


ALTER TABLE public.source_label OWNER TO builder;

--
-- TOC entry 220 (class 1259 OID 186349)
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
-- TOC entry 3437 (class 0 OID 0)
-- Dependencies: 220
-- Name: source_label_source_label_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: builder
--

ALTER SEQUENCE public.source_label_source_label_id_seq OWNED BY public.source_label.source_label_id;


--
-- TOC entry 227 (class 1259 OID 186409)
-- Name: source_label_url; Type: TABLE; Schema: public; Owner: builder
--

CREATE TABLE public.source_label_url (
    source_label_url_id smallint NOT NULL,
    source_label_id smallint NOT NULL,
    url_id bigint NOT NULL,
    roles smallint[] DEFAULT ARRAY[]::smallint[] NOT NULL,
    last_crawled_at timestamp without time zone,
    CONSTRAINT source_label_url_source_label_id_check CHECK ((source_label_id > 0)),
    CONSTRAINT source_label_url_url_id_check CHECK ((url_id > 0))
);


ALTER TABLE public.source_label_url OWNER TO builder;

--
-- TOC entry 226 (class 1259 OID 186408)
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
-- TOC entry 3438 (class 0 OID 0)
-- Dependencies: 226
-- Name: source_label_url_source_label_url_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: builder
--

ALTER SEQUENCE public.source_label_url_source_label_url_id_seq OWNED BY public.source_label_url.source_label_url_id;


--
-- TOC entry 214 (class 1259 OID 186309)
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
-- TOC entry 3439 (class 0 OID 0)
-- Dependencies: 214
-- Name: source_source_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: builder
--

ALTER SEQUENCE public.source_source_id_seq OWNED BY public.source.source_id;


--
-- TOC entry 225 (class 1259 OID 186398)
-- Name: url; Type: TABLE; Schema: public; Owner: builder
--

CREATE TABLE public.url (
    url_id bigint NOT NULL,
    address text NOT NULL
);


ALTER TABLE public.url OWNER TO builder;

--
-- TOC entry 224 (class 1259 OID 186397)
-- Name: url_url_id_seq; Type: SEQUENCE; Schema: public; Owner: builder
--

CREATE SEQUENCE public.url_url_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.url_url_id_seq OWNER TO builder;

--
-- TOC entry 3440 (class 0 OID 0)
-- Dependencies: 224
-- Name: url_url_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: builder
--

ALTER SEQUENCE public.url_url_id_seq OWNED BY public.url.url_id;


--
-- TOC entry 3219 (class 2604 OID 186377)
-- Name: address address_id; Type: DEFAULT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.address ALTER COLUMN address_id SET DEFAULT nextval('public.address_address_id_seq'::regclass);


--
-- TOC entry 3226 (class 2604 OID 186458)
-- Name: address_data address_data_id; Type: DEFAULT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.address_data ALTER COLUMN address_data_id SET DEFAULT nextval('public.address_data_address_data_id_seq'::regclass);


--
-- TOC entry 3215 (class 2604 OID 186325)
-- Name: currency currency_id; Type: DEFAULT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.currency ALTER COLUMN currency_id SET DEFAULT nextval('public.currency_currency_id_seq'::regclass);


--
-- TOC entry 3224 (class 2604 OID 186436)
-- Name: data data_id; Type: DEFAULT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.data ALTER COLUMN data_id SET DEFAULT nextval('public.data_data_id_seq'::regclass);


--
-- TOC entry 3216 (class 2604 OID 186342)
-- Name: role role_id; Type: DEFAULT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.role ALTER COLUMN role_id SET DEFAULT nextval('public.role_role_id_seq'::regclass);


--
-- TOC entry 3213 (class 2604 OID 186313)
-- Name: source source_id; Type: DEFAULT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.source ALTER COLUMN source_id SET DEFAULT nextval('public.source_source_id_seq'::regclass);


--
-- TOC entry 3217 (class 2604 OID 186353)
-- Name: source_label source_label_id; Type: DEFAULT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.source_label ALTER COLUMN source_label_id SET DEFAULT nextval('public.source_label_source_label_id_seq'::regclass);


--
-- TOC entry 3222 (class 2604 OID 186412)
-- Name: source_label_url source_label_url_id; Type: DEFAULT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.source_label_url ALTER COLUMN source_label_url_id SET DEFAULT nextval('public.source_label_url_source_label_url_id_seq'::regclass);


--
-- TOC entry 3221 (class 2604 OID 186401)
-- Name: url url_id; Type: DEFAULT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.url ALTER COLUMN url_id SET DEFAULT nextval('public.url_url_id_seq'::regclass);


--
-- TOC entry 3260 (class 2606 OID 186384)
-- Name: address address_address_id_pkey; Type: CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.address
    ADD CONSTRAINT address_address_id_pkey PRIMARY KEY (address_id);


--
-- TOC entry 3262 (class 2606 OID 186386)
-- Name: address address_address_key; Type: CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.address
    ADD CONSTRAINT address_address_key UNIQUE (address);


--
-- TOC entry 3274 (class 2606 OID 186462)
-- Name: address_data address_data_address_data_id_pkey; Type: CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.address_data
    ADD CONSTRAINT address_data_address_data_id_pkey PRIMARY KEY (address_data_id);


--
-- TOC entry 3242 (class 2606 OID 186337)
-- Name: currency blockchair_request_name_key; Type: CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.currency
    ADD CONSTRAINT blockchair_request_name_key UNIQUE (blockchair_request_name);


--
-- TOC entry 3244 (class 2606 OID 186333)
-- Name: currency currency_code_key; Type: CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.currency
    ADD CONSTRAINT currency_code_key UNIQUE (code);


--
-- TOC entry 3246 (class 2606 OID 186329)
-- Name: currency currency_currency_id_pkey; Type: CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.currency
    ADD CONSTRAINT currency_currency_id_pkey PRIMARY KEY (currency_id);


--
-- TOC entry 3248 (class 2606 OID 186335)
-- Name: currency currency_logo_key; Type: CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.currency
    ADD CONSTRAINT currency_logo_key UNIQUE (logo);


--
-- TOC entry 3250 (class 2606 OID 186331)
-- Name: currency currency_name_key; Type: CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.currency
    ADD CONSTRAINT currency_name_key UNIQUE (name);


--
-- TOC entry 3272 (class 2606 OID 186443)
-- Name: data data_data_id_pkey; Type: CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.data
    ADD CONSTRAINT data_data_id_pkey PRIMARY KEY (data_id);


--
-- TOC entry 3252 (class 2606 OID 186348)
-- Name: role role_name_key; Type: CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.role
    ADD CONSTRAINT role_name_key UNIQUE (name);


--
-- TOC entry 3254 (class 2606 OID 186346)
-- Name: role role_role_id_pkey; Type: CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.role
    ADD CONSTRAINT role_role_id_pkey PRIMARY KEY (role_id);


--
-- TOC entry 3256 (class 2606 OID 186362)
-- Name: source_label source_label_source_id_name_key; Type: CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.source_label
    ADD CONSTRAINT source_label_source_id_name_key UNIQUE (source_id, name);


--
-- TOC entry 3258 (class 2606 OID 186360)
-- Name: source_label source_label_source_label_id_pkey; Type: CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.source_label
    ADD CONSTRAINT source_label_source_label_id_pkey PRIMARY KEY (source_label_id);


--
-- TOC entry 3268 (class 2606 OID 186419)
-- Name: source_label_url source_label_url_id_pkey; Type: CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.source_label_url
    ADD CONSTRAINT source_label_url_id_pkey PRIMARY KEY (source_label_url_id);


--
-- TOC entry 3270 (class 2606 OID 186421)
-- Name: source_label_url source_label_url_source_label_id_url_id_key; Type: CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.source_label_url
    ADD CONSTRAINT source_label_url_source_label_id_url_id_key UNIQUE (source_label_id, url_id);


--
-- TOC entry 3238 (class 2606 OID 186320)
-- Name: source source_name_key; Type: CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.source
    ADD CONSTRAINT source_name_key UNIQUE (name);


--
-- TOC entry 3240 (class 2606 OID 186318)
-- Name: source source_source_id_pkey; Type: CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.source
    ADD CONSTRAINT source_source_id_pkey PRIMARY KEY (source_id);


--
-- TOC entry 3264 (class 2606 OID 186407)
-- Name: url url_address_key; Type: CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.url
    ADD CONSTRAINT url_address_key UNIQUE (address);


--
-- TOC entry 3266 (class 2606 OID 186405)
-- Name: url url_url_id_pkey; Type: CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.url
    ADD CONSTRAINT url_url_id_pkey PRIMARY KEY (url_id);


--
-- TOC entry 3277 (class 2606 OID 186387)
-- Name: address address_currency_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.address
    ADD CONSTRAINT address_currency_id_fkey FOREIGN KEY (currency_id) REFERENCES public.currency(currency_id);


--
-- TOC entry 3283 (class 2606 OID 186463)
-- Name: address_data address_data_address_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.address_data
    ADD CONSTRAINT address_data_address_id_fkey FOREIGN KEY (address_id) REFERENCES public.address(address_id);


--
-- TOC entry 3284 (class 2606 OID 186468)
-- Name: address_data address_data_data_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.address_data
    ADD CONSTRAINT address_data_data_id_fkey FOREIGN KEY (data_id) REFERENCES public.data(data_id);


--
-- TOC entry 3278 (class 2606 OID 186392)
-- Name: address address_source_label_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.address
    ADD CONSTRAINT address_source_label_id_fkey FOREIGN KEY (source_label_id) REFERENCES public.source_label(source_label_id);


--
-- TOC entry 3281 (class 2606 OID 186444)
-- Name: data data_source_label_url_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.data
    ADD CONSTRAINT data_source_label_url_id_fkey FOREIGN KEY (source_label_url_id) REFERENCES public.source_label_url(source_label_url_id);


--
-- TOC entry 3282 (class 2606 OID 186449)
-- Name: data data_url_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.data
    ADD CONSTRAINT data_url_id_fkey FOREIGN KEY (url_id) REFERENCES public.url(url_id);


--
-- TOC entry 3275 (class 2606 OID 186368)
-- Name: source_label source_label_new_addresses_currency_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.source_label
    ADD CONSTRAINT source_label_new_addresses_currency_id_fkey FOREIGN KEY (new_addresses_currency_id) REFERENCES public.currency(currency_id);


--
-- TOC entry 3276 (class 2606 OID 186363)
-- Name: source_label source_label_source_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.source_label
    ADD CONSTRAINT source_label_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.source(source_id);


--
-- TOC entry 3279 (class 2606 OID 186422)
-- Name: source_label_url source_label_url_source_label_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.source_label_url
    ADD CONSTRAINT source_label_url_source_label_id_fkey FOREIGN KEY (source_label_id) REFERENCES public.source_label(source_label_id);


--
-- TOC entry 3280 (class 2606 OID 186427)
-- Name: source_label_url source_label_url_url_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.source_label_url
    ADD CONSTRAINT source_label_url_url_id_fkey FOREIGN KEY (url_id) REFERENCES public.url(url_id);


-- Completed on 2023-01-13 03:50:37

--
-- PostgreSQL database dump complete
--

