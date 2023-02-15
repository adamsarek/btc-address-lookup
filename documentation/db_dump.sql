--
-- PostgreSQL database dump
--

-- Dumped from database version 15.1
-- Dumped by pg_dump version 15.0

-- Started on 2023-02-15 20:54:39

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
-- TOC entry 231 (class 1259 OID 236463)
-- Name: account; Type: TABLE; Schema: public; Owner: builder
--

CREATE TABLE public.account (
    account_id bigint NOT NULL,
    role_id smallint NOT NULL,
    email text NOT NULL,
    password text NOT NULL,
    signed_up_by_ip text NOT NULL,
    last_signed_in_by_ip text,
    signed_up_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    last_signed_in_at timestamp without time zone,
    CONSTRAINT account_role_id_check CHECK ((role_id > 0)),
    CONSTRAINT account_signed_up_at_account_last_signed_in_at_check CHECK ((signed_up_at <= last_signed_in_at))
);


ALTER TABLE public.account OWNER TO builder;

--
-- TOC entry 230 (class 1259 OID 236462)
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
-- TOC entry 221 (class 1259 OID 236372)
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
-- TOC entry 220 (class 1259 OID 236371)
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
-- TOC entry 3476 (class 0 OID 0)
-- Dependencies: 220
-- Name: address_address_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: builder
--

ALTER SEQUENCE public.address_address_id_seq OWNED BY public.address.address_id;


--
-- TOC entry 235 (class 1259 OID 236505)
-- Name: address_data; Type: TABLE; Schema: public; Owner: builder
--

CREATE TABLE public.address_data (
    address_data_id bigint NOT NULL,
    address_id bigint NOT NULL,
    data_id bigint NOT NULL,
    roles smallint[] DEFAULT '{1,2,3,4}'::smallint[] NOT NULL,
    CONSTRAINT address_data_address_id_check CHECK ((address_id > 0)),
    CONSTRAINT address_data_data_id_check CHECK ((data_id > 0))
);


ALTER TABLE public.address_data OWNER TO builder;

--
-- TOC entry 234 (class 1259 OID 236504)
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
-- TOC entry 3479 (class 0 OID 0)
-- Dependencies: 234
-- Name: address_data_address_data_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: builder
--

ALTER SEQUENCE public.address_data_address_data_id_seq OWNED BY public.address_data.address_data_id;


--
-- TOC entry 217 (class 1259 OID 236332)
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
-- TOC entry 216 (class 1259 OID 236331)
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
-- TOC entry 3482 (class 0 OID 0)
-- Dependencies: 216
-- Name: currency_currency_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: builder
--

ALTER SEQUENCE public.currency_currency_id_seq OWNED BY public.currency.currency_id;


--
-- TOC entry 227 (class 1259 OID 236427)
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
-- TOC entry 226 (class 1259 OID 236426)
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
-- TOC entry 3485 (class 0 OID 0)
-- Dependencies: 226
-- Name: data_data_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: builder
--

ALTER SEQUENCE public.data_data_id_seq OWNED BY public.data.data_id;


--
-- TOC entry 229 (class 1259 OID 236452)
-- Name: role; Type: TABLE; Schema: public; Owner: builder
--

CREATE TABLE public.role (
    role_id smallint NOT NULL,
    name text NOT NULL
);


ALTER TABLE public.role OWNER TO builder;

--
-- TOC entry 228 (class 1259 OID 236451)
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
-- TOC entry 3488 (class 0 OID 0)
-- Dependencies: 228
-- Name: role_role_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: builder
--

ALTER SEQUENCE public.role_role_id_seq OWNED BY public.role.role_id;


--
-- TOC entry 236 (class 1259 OID 236528)
-- Name: session; Type: TABLE; Schema: public; Owner: builder
--

CREATE TABLE public.session (
    sid character varying NOT NULL,
    sess json NOT NULL,
    expire timestamp(6) with time zone NOT NULL
);


ALTER TABLE public.session OWNER TO builder;

--
-- TOC entry 215 (class 1259 OID 236321)
-- Name: source; Type: TABLE; Schema: public; Owner: builder
--

CREATE TABLE public.source (
    source_id smallint NOT NULL,
    name text NOT NULL
);


ALTER TABLE public.source OWNER TO builder;

--
-- TOC entry 219 (class 1259 OID 236349)
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
-- TOC entry 218 (class 1259 OID 236348)
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
-- TOC entry 3493 (class 0 OID 0)
-- Dependencies: 218
-- Name: source_label_source_label_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: builder
--

ALTER SEQUENCE public.source_label_source_label_id_seq OWNED BY public.source_label.source_label_id;


--
-- TOC entry 225 (class 1259 OID 236406)
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
-- TOC entry 224 (class 1259 OID 236405)
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
-- TOC entry 3496 (class 0 OID 0)
-- Dependencies: 224
-- Name: source_label_url_source_label_url_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: builder
--

ALTER SEQUENCE public.source_label_url_source_label_url_id_seq OWNED BY public.source_label_url.source_label_url_id;


--
-- TOC entry 214 (class 1259 OID 236320)
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
-- TOC entry 3498 (class 0 OID 0)
-- Dependencies: 214
-- Name: source_source_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: builder
--

ALTER SEQUENCE public.source_source_id_seq OWNED BY public.source.source_id;


--
-- TOC entry 233 (class 1259 OID 236482)
-- Name: token; Type: TABLE; Schema: public; Owner: builder
--

CREATE TABLE public.token (
    token_id bigint NOT NULL,
    account_id bigint NOT NULL,
    token text NOT NULL,
    use_count bigint DEFAULT 0 NOT NULL,
    created_by_ip text NOT NULL,
    last_used_by_ip text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    last_used_at timestamp without time zone,
    reset_use_count_at timestamp without time zone,
    CONSTRAINT token_account_id_check CHECK ((account_id > 0)),
    CONSTRAINT token_created_at_token_last_used_at_check CHECK ((created_at <= last_used_at)),
    CONSTRAINT token_created_at_token_reset_use_count_at_check CHECK ((created_at < reset_use_count_at)),
    CONSTRAINT token_last_used_at_token_reset_use_count_at_check CHECK ((last_used_at < reset_use_count_at)),
    CONSTRAINT token_use_count_check CHECK ((use_count >= 0))
);


ALTER TABLE public.token OWNER TO builder;

--
-- TOC entry 232 (class 1259 OID 236481)
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
-- TOC entry 3501 (class 0 OID 0)
-- Dependencies: 232
-- Name: token_token_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: builder
--

ALTER SEQUENCE public.token_token_id_seq OWNED BY public.token.token_id;


--
-- TOC entry 223 (class 1259 OID 236395)
-- Name: url; Type: TABLE; Schema: public; Owner: builder
--

CREATE TABLE public.url (
    url_id bigint NOT NULL,
    address text NOT NULL
);


ALTER TABLE public.url OWNER TO builder;

--
-- TOC entry 222 (class 1259 OID 236394)
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
-- TOC entry 3504 (class 0 OID 0)
-- Dependencies: 222
-- Name: url_url_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: builder
--

ALTER SEQUENCE public.url_url_id_seq OWNED BY public.url.url_id;


--
-- TOC entry 3236 (class 2604 OID 236466)
-- Name: account account_id; Type: DEFAULT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.account ALTER COLUMN account_id SET DEFAULT nextval('public.account_account_id_seq'::regclass);


--
-- TOC entry 3230 (class 2604 OID 236375)
-- Name: address address_id; Type: DEFAULT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.address ALTER COLUMN address_id SET DEFAULT nextval('public.address_address_id_seq'::regclass);


--
-- TOC entry 3241 (class 2604 OID 236508)
-- Name: address_data address_data_id; Type: DEFAULT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.address_data ALTER COLUMN address_data_id SET DEFAULT nextval('public.address_data_address_data_id_seq'::regclass);


--
-- TOC entry 3228 (class 2604 OID 236335)
-- Name: currency currency_id; Type: DEFAULT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.currency ALTER COLUMN currency_id SET DEFAULT nextval('public.currency_currency_id_seq'::regclass);


--
-- TOC entry 3233 (class 2604 OID 236430)
-- Name: data data_id; Type: DEFAULT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.data ALTER COLUMN data_id SET DEFAULT nextval('public.data_data_id_seq'::regclass);


--
-- TOC entry 3235 (class 2604 OID 236455)
-- Name: role role_id; Type: DEFAULT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.role ALTER COLUMN role_id SET DEFAULT nextval('public.role_role_id_seq'::regclass);


--
-- TOC entry 3227 (class 2604 OID 236324)
-- Name: source source_id; Type: DEFAULT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.source ALTER COLUMN source_id SET DEFAULT nextval('public.source_source_id_seq'::regclass);


--
-- TOC entry 3229 (class 2604 OID 236352)
-- Name: source_label source_label_id; Type: DEFAULT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.source_label ALTER COLUMN source_label_id SET DEFAULT nextval('public.source_label_source_label_id_seq'::regclass);


--
-- TOC entry 3232 (class 2604 OID 236409)
-- Name: source_label_url source_label_url_id; Type: DEFAULT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.source_label_url ALTER COLUMN source_label_url_id SET DEFAULT nextval('public.source_label_url_source_label_url_id_seq'::regclass);


--
-- TOC entry 3238 (class 2604 OID 236485)
-- Name: token token_id; Type: DEFAULT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.token ALTER COLUMN token_id SET DEFAULT nextval('public.token_token_id_seq'::regclass);


--
-- TOC entry 3231 (class 2604 OID 236398)
-- Name: url url_id; Type: DEFAULT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.url ALTER COLUMN url_id SET DEFAULT nextval('public.url_url_id_seq'::regclass);


--
-- TOC entry 3300 (class 2606 OID 236473)
-- Name: account account_account_id_pkey; Type: CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.account
    ADD CONSTRAINT account_account_id_pkey PRIMARY KEY (account_id);


--
-- TOC entry 3302 (class 2606 OID 236475)
-- Name: account account_email_key; Type: CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.account
    ADD CONSTRAINT account_email_key UNIQUE (email);


--
-- TOC entry 3280 (class 2606 OID 236381)
-- Name: address address_address_id_pkey; Type: CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.address
    ADD CONSTRAINT address_address_id_pkey PRIMARY KEY (address_id);


--
-- TOC entry 3282 (class 2606 OID 236383)
-- Name: address address_address_key; Type: CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.address
    ADD CONSTRAINT address_address_key UNIQUE (address);


--
-- TOC entry 3308 (class 2606 OID 236515)
-- Name: address_data address_data_address_data_id_pkey; Type: CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.address_data
    ADD CONSTRAINT address_data_address_data_id_pkey PRIMARY KEY (address_data_id);


--
-- TOC entry 3310 (class 2606 OID 236517)
-- Name: address_data address_data_address_id_address_data_data_id_key; Type: CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.address_data
    ADD CONSTRAINT address_data_address_id_address_data_data_id_key UNIQUE (address_id, data_id);


--
-- TOC entry 3266 (class 2606 OID 236347)
-- Name: currency blockchair_request_name_key; Type: CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.currency
    ADD CONSTRAINT blockchair_request_name_key UNIQUE (blockchair_request_name);


--
-- TOC entry 3268 (class 2606 OID 236343)
-- Name: currency currency_code_key; Type: CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.currency
    ADD CONSTRAINT currency_code_key UNIQUE (code);


--
-- TOC entry 3270 (class 2606 OID 236339)
-- Name: currency currency_currency_id_pkey; Type: CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.currency
    ADD CONSTRAINT currency_currency_id_pkey PRIMARY KEY (currency_id);


--
-- TOC entry 3272 (class 2606 OID 236345)
-- Name: currency currency_logo_key; Type: CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.currency
    ADD CONSTRAINT currency_logo_key UNIQUE (logo);


--
-- TOC entry 3274 (class 2606 OID 236341)
-- Name: currency currency_name_key; Type: CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.currency
    ADD CONSTRAINT currency_name_key UNIQUE (name);


--
-- TOC entry 3292 (class 2606 OID 236438)
-- Name: data data_data_id_pkey; Type: CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.data
    ADD CONSTRAINT data_data_id_pkey PRIMARY KEY (data_id);


--
-- TOC entry 3294 (class 2606 OID 236440)
-- Name: data data_path_key; Type: CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.data
    ADD CONSTRAINT data_path_key UNIQUE (path);


--
-- TOC entry 3296 (class 2606 OID 236461)
-- Name: role role_name_key; Type: CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.role
    ADD CONSTRAINT role_name_key UNIQUE (name);


--
-- TOC entry 3298 (class 2606 OID 236459)
-- Name: role role_role_id_pkey; Type: CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.role
    ADD CONSTRAINT role_role_id_pkey PRIMARY KEY (role_id);


--
-- TOC entry 3312 (class 2606 OID 236534)
-- Name: session session_sid_pkey; Type: CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_sid_pkey PRIMARY KEY (sid);


--
-- TOC entry 3276 (class 2606 OID 236360)
-- Name: source_label source_label_source_id_name_key; Type: CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.source_label
    ADD CONSTRAINT source_label_source_id_name_key UNIQUE (source_id, name);


--
-- TOC entry 3278 (class 2606 OID 236358)
-- Name: source_label source_label_source_label_id_pkey; Type: CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.source_label
    ADD CONSTRAINT source_label_source_label_id_pkey PRIMARY KEY (source_label_id);


--
-- TOC entry 3288 (class 2606 OID 236413)
-- Name: source_label_url source_label_url_id_pkey; Type: CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.source_label_url
    ADD CONSTRAINT source_label_url_id_pkey PRIMARY KEY (source_label_url_id);


--
-- TOC entry 3290 (class 2606 OID 236415)
-- Name: source_label_url source_label_url_source_label_id_url_id_key; Type: CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.source_label_url
    ADD CONSTRAINT source_label_url_source_label_id_url_id_key UNIQUE (source_label_id, url_id);


--
-- TOC entry 3262 (class 2606 OID 236330)
-- Name: source source_name_key; Type: CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.source
    ADD CONSTRAINT source_name_key UNIQUE (name);


--
-- TOC entry 3264 (class 2606 OID 236328)
-- Name: source source_source_id_pkey; Type: CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.source
    ADD CONSTRAINT source_source_id_pkey PRIMARY KEY (source_id);


--
-- TOC entry 3304 (class 2606 OID 236496)
-- Name: token token_token_id_pkey; Type: CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.token
    ADD CONSTRAINT token_token_id_pkey PRIMARY KEY (token_id);


--
-- TOC entry 3306 (class 2606 OID 236498)
-- Name: token token_token_key; Type: CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.token
    ADD CONSTRAINT token_token_key UNIQUE (token);


--
-- TOC entry 3284 (class 2606 OID 236404)
-- Name: url url_address_key; Type: CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.url
    ADD CONSTRAINT url_address_key UNIQUE (address);


--
-- TOC entry 3286 (class 2606 OID 236402)
-- Name: url url_url_id_pkey; Type: CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.url
    ADD CONSTRAINT url_url_id_pkey PRIMARY KEY (url_id);


--
-- TOC entry 3321 (class 2606 OID 236476)
-- Name: account account_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.account
    ADD CONSTRAINT account_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.role(role_id);


--
-- TOC entry 3315 (class 2606 OID 236384)
-- Name: address address_currency_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.address
    ADD CONSTRAINT address_currency_id_fkey FOREIGN KEY (currency_id) REFERENCES public.currency(currency_id);


--
-- TOC entry 3323 (class 2606 OID 236518)
-- Name: address_data address_data_address_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.address_data
    ADD CONSTRAINT address_data_address_id_fkey FOREIGN KEY (address_id) REFERENCES public.address(address_id);


--
-- TOC entry 3324 (class 2606 OID 236523)
-- Name: address_data address_data_data_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.address_data
    ADD CONSTRAINT address_data_data_id_fkey FOREIGN KEY (data_id) REFERENCES public.data(data_id);


--
-- TOC entry 3316 (class 2606 OID 236389)
-- Name: address address_source_label_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.address
    ADD CONSTRAINT address_source_label_id_fkey FOREIGN KEY (source_label_id) REFERENCES public.source_label(source_label_id);


--
-- TOC entry 3319 (class 2606 OID 236441)
-- Name: data data_source_label_url_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.data
    ADD CONSTRAINT data_source_label_url_id_fkey FOREIGN KEY (source_label_url_id) REFERENCES public.source_label_url(source_label_url_id);


--
-- TOC entry 3320 (class 2606 OID 236446)
-- Name: data data_url_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.data
    ADD CONSTRAINT data_url_id_fkey FOREIGN KEY (url_id) REFERENCES public.url(url_id);


--
-- TOC entry 3313 (class 2606 OID 236366)
-- Name: source_label source_label_new_addresses_currency_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.source_label
    ADD CONSTRAINT source_label_new_addresses_currency_id_fkey FOREIGN KEY (new_addresses_currency_id) REFERENCES public.currency(currency_id);


--
-- TOC entry 3314 (class 2606 OID 236361)
-- Name: source_label source_label_source_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.source_label
    ADD CONSTRAINT source_label_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.source(source_id);


--
-- TOC entry 3317 (class 2606 OID 236416)
-- Name: source_label_url source_label_url_source_label_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.source_label_url
    ADD CONSTRAINT source_label_url_source_label_id_fkey FOREIGN KEY (source_label_id) REFERENCES public.source_label(source_label_id);


--
-- TOC entry 3318 (class 2606 OID 236421)
-- Name: source_label_url source_label_url_url_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.source_label_url
    ADD CONSTRAINT source_label_url_url_id_fkey FOREIGN KEY (url_id) REFERENCES public.url(url_id);


--
-- TOC entry 3322 (class 2606 OID 236499)
-- Name: token token_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: builder
--

ALTER TABLE ONLY public.token
    ADD CONSTRAINT token_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.account(account_id);


--
-- TOC entry 3472 (class 0 OID 0)
-- Dependencies: 231
-- Name: TABLE account; Type: ACL; Schema: public; Owner: builder
--

GRANT SELECT,INSERT,UPDATE ON TABLE public.account TO client;


--
-- TOC entry 3474 (class 0 OID 0)
-- Dependencies: 230
-- Name: SEQUENCE account_account_id_seq; Type: ACL; Schema: public; Owner: builder
--

GRANT SELECT,USAGE ON SEQUENCE public.account_account_id_seq TO client;


--
-- TOC entry 3475 (class 0 OID 0)
-- Dependencies: 221
-- Name: TABLE address; Type: ACL; Schema: public; Owner: builder
--

GRANT SELECT ON TABLE public.address TO client;


--
-- TOC entry 3477 (class 0 OID 0)
-- Dependencies: 220
-- Name: SEQUENCE address_address_id_seq; Type: ACL; Schema: public; Owner: builder
--

GRANT SELECT,USAGE ON SEQUENCE public.address_address_id_seq TO client;


--
-- TOC entry 3478 (class 0 OID 0)
-- Dependencies: 235
-- Name: TABLE address_data; Type: ACL; Schema: public; Owner: builder
--

GRANT SELECT ON TABLE public.address_data TO client;


--
-- TOC entry 3480 (class 0 OID 0)
-- Dependencies: 234
-- Name: SEQUENCE address_data_address_data_id_seq; Type: ACL; Schema: public; Owner: builder
--

GRANT SELECT,USAGE ON SEQUENCE public.address_data_address_data_id_seq TO client;


--
-- TOC entry 3481 (class 0 OID 0)
-- Dependencies: 217
-- Name: TABLE currency; Type: ACL; Schema: public; Owner: builder
--

GRANT SELECT ON TABLE public.currency TO client;


--
-- TOC entry 3483 (class 0 OID 0)
-- Dependencies: 216
-- Name: SEQUENCE currency_currency_id_seq; Type: ACL; Schema: public; Owner: builder
--

GRANT SELECT,USAGE ON SEQUENCE public.currency_currency_id_seq TO client;


--
-- TOC entry 3484 (class 0 OID 0)
-- Dependencies: 227
-- Name: TABLE data; Type: ACL; Schema: public; Owner: builder
--

GRANT SELECT ON TABLE public.data TO client;


--
-- TOC entry 3486 (class 0 OID 0)
-- Dependencies: 226
-- Name: SEQUENCE data_data_id_seq; Type: ACL; Schema: public; Owner: builder
--

GRANT SELECT,USAGE ON SEQUENCE public.data_data_id_seq TO client;


--
-- TOC entry 3487 (class 0 OID 0)
-- Dependencies: 229
-- Name: TABLE role; Type: ACL; Schema: public; Owner: builder
--

GRANT SELECT ON TABLE public.role TO client;


--
-- TOC entry 3489 (class 0 OID 0)
-- Dependencies: 228
-- Name: SEQUENCE role_role_id_seq; Type: ACL; Schema: public; Owner: builder
--

GRANT SELECT,USAGE ON SEQUENCE public.role_role_id_seq TO client;


--
-- TOC entry 3490 (class 0 OID 0)
-- Dependencies: 236
-- Name: TABLE session; Type: ACL; Schema: public; Owner: builder
--

GRANT ALL ON TABLE public.session TO client;


--
-- TOC entry 3491 (class 0 OID 0)
-- Dependencies: 215
-- Name: TABLE source; Type: ACL; Schema: public; Owner: builder
--

GRANT SELECT ON TABLE public.source TO client;


--
-- TOC entry 3492 (class 0 OID 0)
-- Dependencies: 219
-- Name: TABLE source_label; Type: ACL; Schema: public; Owner: builder
--

GRANT SELECT ON TABLE public.source_label TO client;


--
-- TOC entry 3494 (class 0 OID 0)
-- Dependencies: 218
-- Name: SEQUENCE source_label_source_label_id_seq; Type: ACL; Schema: public; Owner: builder
--

GRANT SELECT,USAGE ON SEQUENCE public.source_label_source_label_id_seq TO client;


--
-- TOC entry 3495 (class 0 OID 0)
-- Dependencies: 225
-- Name: TABLE source_label_url; Type: ACL; Schema: public; Owner: builder
--

GRANT SELECT ON TABLE public.source_label_url TO client;


--
-- TOC entry 3497 (class 0 OID 0)
-- Dependencies: 224
-- Name: SEQUENCE source_label_url_source_label_url_id_seq; Type: ACL; Schema: public; Owner: builder
--

GRANT SELECT,USAGE ON SEQUENCE public.source_label_url_source_label_url_id_seq TO client;


--
-- TOC entry 3499 (class 0 OID 0)
-- Dependencies: 214
-- Name: SEQUENCE source_source_id_seq; Type: ACL; Schema: public; Owner: builder
--

GRANT SELECT,USAGE ON SEQUENCE public.source_source_id_seq TO client;


--
-- TOC entry 3500 (class 0 OID 0)
-- Dependencies: 233
-- Name: TABLE token; Type: ACL; Schema: public; Owner: builder
--

GRANT SELECT,INSERT,UPDATE ON TABLE public.token TO client;


--
-- TOC entry 3502 (class 0 OID 0)
-- Dependencies: 232
-- Name: SEQUENCE token_token_id_seq; Type: ACL; Schema: public; Owner: builder
--

GRANT SELECT,USAGE ON SEQUENCE public.token_token_id_seq TO client;


--
-- TOC entry 3503 (class 0 OID 0)
-- Dependencies: 223
-- Name: TABLE url; Type: ACL; Schema: public; Owner: builder
--

GRANT SELECT ON TABLE public.url TO client;


--
-- TOC entry 3505 (class 0 OID 0)
-- Dependencies: 222
-- Name: SEQUENCE url_url_id_seq; Type: ACL; Schema: public; Owner: builder
--

GRANT SELECT,USAGE ON SEQUENCE public.url_url_id_seq TO client;


-- Completed on 2023-02-15 20:54:39

--
-- PostgreSQL database dump complete
--

