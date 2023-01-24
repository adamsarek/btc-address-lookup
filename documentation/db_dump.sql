--
-- PostgreSQL database dump
--

-- Dumped from database version 15.1
-- Dumped by pg_dump version 15.0

-- Started on 2023-01-24 03:43:43

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
-- TOC entry 231 (class 1259 OID 213371)
-- Name: account; Type: TABLE; Schema: public; Owner: builder
--

CREATE TABLE public.account (
    account_id bigint NOT NULL,
    role_id smallint NOT NULL,
    email text NOT NULL,
    password text NOT NULL,
    salt text NOT NULL,
    signed_up_by_ip text NOT NULL,
    last_signed_in_by_ip text,
    signed_up_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    last_signed_in_at timestamp without time zone,
    CONSTRAINT account_role_id_check CHECK ((role_id > 0)),
    CONSTRAINT account_signed_up_at_account_last_signed_in_at_check CHECK ((signed_up_at <= last_signed_in_at))
);


ALTER TABLE public.account OWNER TO builder;

--
-- TOC entry 230 (class 1259 OID 213370)
-- Name: account_account_id_seq; Type: SEQUENCE; Schema: public; Owner: builder
--

CREATE SEQUENCE public.account_account_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.account_account_id_seq OWNER TO builder;

--
-- TOC entry 3473 (class 0 OID 0)
-- Dependencies: 230
-- Name: account_account_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: builder
--

ALTER SEQUENCE public.account_account_id_seq OWNED BY public.account.account_id;


--
-- TOC entry 221 (class 1259 OID 213280)
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
-- TOC entry 220 (class 1259 OID 213279)
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
-- TOC entry 3475 (class 0 OID 0)
-- Dependencies: 220
-- Name: address_address_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: builder
--

ALTER SEQUENCE public.address_address_id_seq OWNED BY public.address.address_id;


--
-- TOC entry 235 (class 1259 OID 213423)
-- Name: address_data; Type: TABLE; Schema: public; Owner: builder
--

CREATE TABLE public.address_data (
    address_data_id bigint NOT NULL,
    address_id bigint NOT NULL,
    data_id bigint NOT NULL,
    roles smallint[] DEFAULT '{1,2,3}'::smallint[] NOT NULL,
    CONSTRAINT address_data_address_id_check CHECK ((address_id > 0)),
    CONSTRAINT address_data_data_id_check CHECK ((data_id > 0))
);


ALTER TABLE public.address_data OWNER TO builder;

--
-- TOC entry 234 (class 1259 OID 213422)
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
-- TOC entry 3477 (class 0 OID 0)
-- Dependencies: 234
-- Name: address_data_address_data_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: builder
--

ALTER SEQUENCE public.address_data_address_data_id_seq OWNED BY public.address_data.address_data_id;


--
-- TOC entry 217 (class 1259 OID 213240)
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
-- TOC entry 216 (class 1259 OID 213239)
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
-- TOC entry 3479 (class 0 OID 0)
-- Dependencies: 216
-- Name: currency_currency_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: builder
--

ALTER SEQUENCE public.currency_currency_id_seq OWNED BY public.currency.currency_id;


--
-- TOC entry 227 (class 1259 OID 213335)
-- Name: data; Type: TABLE; Schema: public; Owner: builder
--

CREATE TABLE public.data (
    data_id bigint NOT NULL,
    source_label_url_id smallint NOT NULL,
    url_id bigint NOT NULL,
    path text NOT NULL,
    content_length bigint NOT NULL,
    crawled_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT data_content_length_check CHECK ((content_length > 0)),
    CONSTRAINT data_source_label_url_id_check CHECK ((source_label_url_id > 0)),
    CONSTRAINT data_url_id_check CHECK ((url_id > 0))
);


ALTER TABLE public.data OWNER TO builder;

--
-- TOC entry 226 (class 1259 OID 213334)
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
-- TOC entry 3481 (class 0 OID 0)
-- Dependencies: 226
-- Name: data_data_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: builder
--

ALTER SEQUENCE public.data_data_id_seq OWNED BY public.data.data_id;


--
-- TOC entry 229 (class 1259 OID 213360)
-- Name: role; Type: TABLE; Schema: public; Owner: builder
--

CREATE TABLE public.role (
    role_id smallint NOT NULL,
    name text NOT NULL
);


ALTER TABLE public.role OWNER TO builder;

--
-- TOC entry 228 (class 1259 OID 213359)
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
-- TOC entry 3483 (class 0 OID 0)
-- Dependencies: 228
-- Name: role_role_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: builder
--

ALTER SEQUENCE public.role_role_id_seq OWNED BY public.role.role_id;


--
-- TOC entry 215 (class 1259 OID 213229)
-- Name: source; Type: TABLE; Schema: public; Owner: builder
--

CREATE TABLE public.source (
    source_id smallint NOT NULL,
    name text NOT NULL
);


ALTER TABLE public.source OWNER TO builder;

--
-- TOC entry 219 (class 1259 OID 213257)
-- Name: source_label; Type: TABLE; Schema: public; Owner: builder
--

CREATE TABLE public.source_label (
    source_label_id smallint NOT NULL,
    source_id smallint NOT NULL,
    new_addresses_currency_id smallint,
    search_data_by_address boolean NOT NULL,
    name text NOT NULL,
    CONSTRAINT source_label_new_addresses_currency_id_check CHECK ((new_addresses_currency_id > 0)),
    CONSTRAINT source_label_source_id_check CHECK ((source_id > 0))
);


ALTER TABLE public.source_label OWNER TO builder;

--
-- TOC entry 218 (class 1259 OID 213256)
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
-- TOC entry 3486 (class 0 OID 0)
-- Dependencies: 218
-- Name: source_label_source_label_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: builder
--

ALTER SEQUENCE public.source_label_source_label_id_seq OWNED BY public.source_label.source_label_id;


--
-- TOC entry 225 (class 1259 OID 213314)
-- Name: source_label_url; Type: TABLE; Schema: public; Owner: builder
--

CREATE TABLE public.source_label_url (
    source_label_url_id smallint NOT NULL,
    source_label_id smallint NOT NULL,
    url_id bigint NOT NULL,
    last_crawled_at timestamp without time zone,
    CONSTRAINT source_label_url_source_label_id_check CHECK ((source_label_id > 0)),
    CONSTRAINT source_label_url_url_id_check CHECK ((url_id > 0))
);


ALTER TABLE public.source_label_url OWNER TO builder;

--
-- TOC entry 224 (class 1259 OID 213313)
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
-- TOC entry 3488 (class 0 OID 0)
-- Dependencies: 224
-- Name: source_label_url_source_label_url_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: builder
--

ALTER SEQUENCE public.source_label_url_source_label_url_id_seq OWNED BY public.source_label_url.source_label_url_id;


--
-- TOC entry 214 (class 1259 OID 213228)
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
-- TOC entry 3489 (class 0 OID 0)
-- Dependencies: 214
-- Name: source_source_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: builder
--

ALTER SEQUENCE public.source_source_id_seq OWNED BY public.source.source_id;


--
-- TOC entry 233 (class 1259 OID 213392)
-- Name: token; Type: TABLE; Schema: public; Owner: builder
--

CREATE TABLE public.token (
    token_id bigint NOT NULL,
    role_id smallint NOT NULL,
    account_id bigint,
    token text NOT NULL,
    use_count bigint DEFAULT 0 NOT NULL,
    use_count_limit bigint NOT NULL,
    created_by_ip text NOT NULL,
    last_used_by_ip text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    last_used_at timestamp without time zone,
    reset_use_count_at timestamp without time zone,
    CONSTRAINT token_account_id_check CHECK ((account_id > 0)),
    CONSTRAINT token_created_at_token_last_used_at_check CHECK ((created_at <= last_used_at)),
    CONSTRAINT token_created_at_token_reset_use_count_at_check CHECK ((created_at < reset_use_count_at)),
    CONSTRAINT token_last_used_at_token_reset_use_count_at_check CHECK ((last_used_at < reset_use_count_at)),
    CONSTRAINT token_role_id_check CHECK ((role_id > 0)),
    CONSTRAINT token_use_count_check CHECK ((use_count >= 0)),
    CONSTRAINT token_use_count_limit_check CHECK ((use_count_limit >= 0)),
    CONSTRAINT token_use_count_token_use_count_limit_check CHECK ((use_count <= use_count_limit))
);


ALTER TABLE public.token OWNER TO builder;

--
-- TOC entry 232 (class 1259 OID 213391)
-- Name: token_token_id_seq; Type: SEQUENCE; Schema: public; Owner: builder
--

CREATE SEQUENCE public.token_token_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.token_token_id_seq OWNER TO builder;

--
-- TOC entry 3491 (class 0 OID 0)
-- Dependencies: 232
-- Name: token_token_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: builder
--

ALTER SEQUENCE public.token_token_id_seq OWNED BY public.token.token_id;


--
-- TOC entry 223 (class 1259 OID 213303)
-- Name: url; Type: TABLE; Schema: public; Owner: builder
--

CREATE TABLE public.url (
    url_id bigint NOT NULL,
    address text NOT NULL
);


ALTER TABLE public.url OWNER TO builder;

--
-- TOC entry 222 (class 1259 OID 213302)
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
-- TOC entry 3493 (class 0 OID 0)
-- Dependencies: 222
-- Name: url_url_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: builder
--

ALTER SEQUENCE public.url_url_id_seq OWNED BY public.url.url_id;


--
-- TOC entry 3232 (class 2604 OID 213374)
-- Name: account account_id; Type: DEFAULT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.account ALTER COLUMN account_id SET DEFAULT nextval('public.account_account_id_seq'::regclass);


--
-- TOC entry 3226 (class 2604 OID 213283)
-- Name: address address_id; Type: DEFAULT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.address ALTER COLUMN address_id SET DEFAULT nextval('public.address_address_id_seq'::regclass);


--
-- TOC entry 3237 (class 2604 OID 213426)
-- Name: address_data address_data_id; Type: DEFAULT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.address_data ALTER COLUMN address_data_id SET DEFAULT nextval('public.address_data_address_data_id_seq'::regclass);


--
-- TOC entry 3224 (class 2604 OID 213243)
-- Name: currency currency_id; Type: DEFAULT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.currency ALTER COLUMN currency_id SET DEFAULT nextval('public.currency_currency_id_seq'::regclass);


--
-- TOC entry 3229 (class 2604 OID 213338)
-- Name: data data_id; Type: DEFAULT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.data ALTER COLUMN data_id SET DEFAULT nextval('public.data_data_id_seq'::regclass);


--
-- TOC entry 3231 (class 2604 OID 213363)
-- Name: role role_id; Type: DEFAULT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.role ALTER COLUMN role_id SET DEFAULT nextval('public.role_role_id_seq'::regclass);


--
-- TOC entry 3223 (class 2604 OID 213232)
-- Name: source source_id; Type: DEFAULT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.source ALTER COLUMN source_id SET DEFAULT nextval('public.source_source_id_seq'::regclass);


--
-- TOC entry 3225 (class 2604 OID 213260)
-- Name: source_label source_label_id; Type: DEFAULT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.source_label ALTER COLUMN source_label_id SET DEFAULT nextval('public.source_label_source_label_id_seq'::regclass);


--
-- TOC entry 3228 (class 2604 OID 213317)
-- Name: source_label_url source_label_url_id; Type: DEFAULT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.source_label_url ALTER COLUMN source_label_url_id SET DEFAULT nextval('public.source_label_url_source_label_url_id_seq'::regclass);


--
-- TOC entry 3234 (class 2604 OID 213395)
-- Name: token token_id; Type: DEFAULT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.token ALTER COLUMN token_id SET DEFAULT nextval('public.token_token_id_seq'::regclass);


--
-- TOC entry 3227 (class 2604 OID 213306)
-- Name: url url_id; Type: DEFAULT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.url ALTER COLUMN url_id SET DEFAULT nextval('public.url_url_id_seq'::regclass);


--
-- TOC entry 3299 (class 2606 OID 213381)
-- Name: account account_account_id_pkey; Type: CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.account
    ADD CONSTRAINT account_account_id_pkey PRIMARY KEY (account_id);


--
-- TOC entry 3301 (class 2606 OID 213383)
-- Name: account account_email_key; Type: CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.account
    ADD CONSTRAINT account_email_key UNIQUE (email);


--
-- TOC entry 3303 (class 2606 OID 213385)
-- Name: account account_salt_key; Type: CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.account
    ADD CONSTRAINT account_salt_key UNIQUE (salt);


--
-- TOC entry 3279 (class 2606 OID 213289)
-- Name: address address_address_id_pkey; Type: CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.address
    ADD CONSTRAINT address_address_id_pkey PRIMARY KEY (address_id);


--
-- TOC entry 3281 (class 2606 OID 213291)
-- Name: address address_address_key; Type: CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.address
    ADD CONSTRAINT address_address_key UNIQUE (address);


--
-- TOC entry 3309 (class 2606 OID 213433)
-- Name: address_data address_data_address_data_id_pkey; Type: CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.address_data
    ADD CONSTRAINT address_data_address_data_id_pkey PRIMARY KEY (address_data_id);


--
-- TOC entry 3311 (class 2606 OID 213435)
-- Name: address_data address_data_address_id_address_data_data_id_key; Type: CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.address_data
    ADD CONSTRAINT address_data_address_id_address_data_data_id_key UNIQUE (address_id, data_id);


--
-- TOC entry 3265 (class 2606 OID 213255)
-- Name: currency blockchair_request_name_key; Type: CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.currency
    ADD CONSTRAINT blockchair_request_name_key UNIQUE (blockchair_request_name);


--
-- TOC entry 3267 (class 2606 OID 213251)
-- Name: currency currency_code_key; Type: CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.currency
    ADD CONSTRAINT currency_code_key UNIQUE (code);


--
-- TOC entry 3269 (class 2606 OID 213247)
-- Name: currency currency_currency_id_pkey; Type: CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.currency
    ADD CONSTRAINT currency_currency_id_pkey PRIMARY KEY (currency_id);


--
-- TOC entry 3271 (class 2606 OID 213253)
-- Name: currency currency_logo_key; Type: CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.currency
    ADD CONSTRAINT currency_logo_key UNIQUE (logo);


--
-- TOC entry 3273 (class 2606 OID 213249)
-- Name: currency currency_name_key; Type: CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.currency
    ADD CONSTRAINT currency_name_key UNIQUE (name);


--
-- TOC entry 3291 (class 2606 OID 213346)
-- Name: data data_data_id_pkey; Type: CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.data
    ADD CONSTRAINT data_data_id_pkey PRIMARY KEY (data_id);


--
-- TOC entry 3293 (class 2606 OID 213348)
-- Name: data data_path_key; Type: CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.data
    ADD CONSTRAINT data_path_key UNIQUE (path);


--
-- TOC entry 3295 (class 2606 OID 213369)
-- Name: role role_name_key; Type: CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.role
    ADD CONSTRAINT role_name_key UNIQUE (name);


--
-- TOC entry 3297 (class 2606 OID 213367)
-- Name: role role_role_id_pkey; Type: CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.role
    ADD CONSTRAINT role_role_id_pkey PRIMARY KEY (role_id);


--
-- TOC entry 3275 (class 2606 OID 213268)
-- Name: source_label source_label_source_id_name_key; Type: CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.source_label
    ADD CONSTRAINT source_label_source_id_name_key UNIQUE (source_id, name);


--
-- TOC entry 3277 (class 2606 OID 213266)
-- Name: source_label source_label_source_label_id_pkey; Type: CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.source_label
    ADD CONSTRAINT source_label_source_label_id_pkey PRIMARY KEY (source_label_id);


--
-- TOC entry 3287 (class 2606 OID 213321)
-- Name: source_label_url source_label_url_id_pkey; Type: CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.source_label_url
    ADD CONSTRAINT source_label_url_id_pkey PRIMARY KEY (source_label_url_id);


--
-- TOC entry 3289 (class 2606 OID 213323)
-- Name: source_label_url source_label_url_source_label_id_url_id_key; Type: CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.source_label_url
    ADD CONSTRAINT source_label_url_source_label_id_url_id_key UNIQUE (source_label_id, url_id);


--
-- TOC entry 3261 (class 2606 OID 213238)
-- Name: source source_name_key; Type: CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.source
    ADD CONSTRAINT source_name_key UNIQUE (name);


--
-- TOC entry 3263 (class 2606 OID 213236)
-- Name: source source_source_id_pkey; Type: CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.source
    ADD CONSTRAINT source_source_id_pkey PRIMARY KEY (source_id);


--
-- TOC entry 3305 (class 2606 OID 213409)
-- Name: token token_token_id_pkey; Type: CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.token
    ADD CONSTRAINT token_token_id_pkey PRIMARY KEY (token_id);


--
-- TOC entry 3307 (class 2606 OID 213411)
-- Name: token token_token_key; Type: CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.token
    ADD CONSTRAINT token_token_key UNIQUE (token);


--
-- TOC entry 3283 (class 2606 OID 213312)
-- Name: url url_address_key; Type: CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.url
    ADD CONSTRAINT url_address_key UNIQUE (address);


--
-- TOC entry 3285 (class 2606 OID 213310)
-- Name: url url_url_id_pkey; Type: CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.url
    ADD CONSTRAINT url_url_id_pkey PRIMARY KEY (url_id);


--
-- TOC entry 3320 (class 2606 OID 213386)
-- Name: account account_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.account
    ADD CONSTRAINT account_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.role(role_id);


--
-- TOC entry 3314 (class 2606 OID 213292)
-- Name: address address_currency_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.address
    ADD CONSTRAINT address_currency_id_fkey FOREIGN KEY (currency_id) REFERENCES public.currency(currency_id);


--
-- TOC entry 3323 (class 2606 OID 213436)
-- Name: address_data address_data_address_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.address_data
    ADD CONSTRAINT address_data_address_id_fkey FOREIGN KEY (address_id) REFERENCES public.address(address_id);


--
-- TOC entry 3324 (class 2606 OID 213441)
-- Name: address_data address_data_data_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.address_data
    ADD CONSTRAINT address_data_data_id_fkey FOREIGN KEY (data_id) REFERENCES public.data(data_id);


--
-- TOC entry 3315 (class 2606 OID 213297)
-- Name: address address_source_label_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.address
    ADD CONSTRAINT address_source_label_id_fkey FOREIGN KEY (source_label_id) REFERENCES public.source_label(source_label_id);


--
-- TOC entry 3318 (class 2606 OID 213349)
-- Name: data data_source_label_url_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.data
    ADD CONSTRAINT data_source_label_url_id_fkey FOREIGN KEY (source_label_url_id) REFERENCES public.source_label_url(source_label_url_id);


--
-- TOC entry 3319 (class 2606 OID 213354)
-- Name: data data_url_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.data
    ADD CONSTRAINT data_url_id_fkey FOREIGN KEY (url_id) REFERENCES public.url(url_id);


--
-- TOC entry 3312 (class 2606 OID 213274)
-- Name: source_label source_label_new_addresses_currency_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.source_label
    ADD CONSTRAINT source_label_new_addresses_currency_id_fkey FOREIGN KEY (new_addresses_currency_id) REFERENCES public.currency(currency_id);


--
-- TOC entry 3313 (class 2606 OID 213269)
-- Name: source_label source_label_source_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.source_label
    ADD CONSTRAINT source_label_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.source(source_id);


--
-- TOC entry 3316 (class 2606 OID 213324)
-- Name: source_label_url source_label_url_source_label_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.source_label_url
    ADD CONSTRAINT source_label_url_source_label_id_fkey FOREIGN KEY (source_label_id) REFERENCES public.source_label(source_label_id);


--
-- TOC entry 3317 (class 2606 OID 213329)
-- Name: source_label_url source_label_url_url_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.source_label_url
    ADD CONSTRAINT source_label_url_url_id_fkey FOREIGN KEY (url_id) REFERENCES public.url(url_id);


--
-- TOC entry 3321 (class 2606 OID 213417)
-- Name: token token_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.token
    ADD CONSTRAINT token_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.account(account_id);


--
-- TOC entry 3322 (class 2606 OID 213412)
-- Name: token token_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.token
    ADD CONSTRAINT token_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.role(role_id);


--
-- TOC entry 3472 (class 0 OID 0)
-- Dependencies: 231
-- Name: TABLE account; Type: ACL; Schema: public; Owner: builder
--

GRANT SELECT,INSERT,UPDATE ON TABLE public.account TO client;


--
-- TOC entry 3474 (class 0 OID 0)
-- Dependencies: 221
-- Name: TABLE address; Type: ACL; Schema: public; Owner: builder
--

GRANT SELECT ON TABLE public.address TO client;


--
-- TOC entry 3476 (class 0 OID 0)
-- Dependencies: 235
-- Name: TABLE address_data; Type: ACL; Schema: public; Owner: builder
--

GRANT SELECT ON TABLE public.address_data TO client;


--
-- TOC entry 3478 (class 0 OID 0)
-- Dependencies: 217
-- Name: TABLE currency; Type: ACL; Schema: public; Owner: builder
--

GRANT SELECT ON TABLE public.currency TO client;


--
-- TOC entry 3480 (class 0 OID 0)
-- Dependencies: 227
-- Name: TABLE data; Type: ACL; Schema: public; Owner: builder
--

GRANT SELECT ON TABLE public.data TO client;


--
-- TOC entry 3482 (class 0 OID 0)
-- Dependencies: 229
-- Name: TABLE role; Type: ACL; Schema: public; Owner: builder
--

GRANT SELECT ON TABLE public.role TO client;


--
-- TOC entry 3484 (class 0 OID 0)
-- Dependencies: 215
-- Name: TABLE source; Type: ACL; Schema: public; Owner: builder
--

GRANT SELECT ON TABLE public.source TO client;


--
-- TOC entry 3485 (class 0 OID 0)
-- Dependencies: 219
-- Name: TABLE source_label; Type: ACL; Schema: public; Owner: builder
--

GRANT SELECT ON TABLE public.source_label TO client;


--
-- TOC entry 3487 (class 0 OID 0)
-- Dependencies: 225
-- Name: TABLE source_label_url; Type: ACL; Schema: public; Owner: builder
--

GRANT SELECT ON TABLE public.source_label_url TO client;


--
-- TOC entry 3490 (class 0 OID 0)
-- Dependencies: 233
-- Name: TABLE token; Type: ACL; Schema: public; Owner: builder
--

GRANT SELECT,INSERT,UPDATE ON TABLE public.token TO client;


--
-- TOC entry 3492 (class 0 OID 0)
-- Dependencies: 223
-- Name: TABLE url; Type: ACL; Schema: public; Owner: builder
--

GRANT SELECT ON TABLE public.url TO client;


-- Completed on 2023-01-24 03:43:43

--
-- PostgreSQL database dump complete
--

