--
-- PostgreSQL database dump
--

\restrict kIZKFh9RNvbJya02mpdsMLoEFZXpqtT7QXLep36dcyUrsTCCUEFH8kxdmJMg8ab

-- Dumped from database version 18.1
-- Dumped by pg_dump version 18.1

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

ALTER TABLE IF EXISTS ONLY "public"."wishlists" DROP CONSTRAINT IF EXISTS "wishlists_user_id_users_id_fk";
ALTER TABLE IF EXISTS ONLY "public"."wishlists" DROP CONSTRAINT IF EXISTS "wishlists_product_id_products_id_fk";
ALTER TABLE IF EXISTS ONLY "public"."variants" DROP CONSTRAINT IF EXISTS "variants_product_id_products_id_fk";
ALTER TABLE IF EXISTS ONLY "public"."reviews" DROP CONSTRAINT IF EXISTS "reviews_user_id_users_id_fk";
ALTER TABLE IF EXISTS ONLY "public"."reviews" DROP CONSTRAINT IF EXISTS "reviews_product_id_products_id_fk";
ALTER TABLE IF EXISTS ONLY "public"."referrals" DROP CONSTRAINT IF EXISTS "referrals_referrer_id_users_id_fk";
ALTER TABLE IF EXISTS ONLY "public"."referrals" DROP CONSTRAINT IF EXISTS "referrals_referee_id_users_id_fk";
ALTER TABLE IF EXISTS ONLY "public"."products" DROP CONSTRAINT IF EXISTS "products_category_id_categories_id_fk";
ALTER TABLE IF EXISTS ONLY "public"."payments" DROP CONSTRAINT IF EXISTS "payments_user_id_users_id_fk";
ALTER TABLE IF EXISTS ONLY "public"."payments" DROP CONSTRAINT IF EXISTS "payments_order_id_orders_id_fk";
ALTER TABLE IF EXISTS ONLY "public"."orders" DROP CONSTRAINT IF EXISTS "orders_user_id_users_id_fk";
ALTER TABLE IF EXISTS ONLY "public"."order_items" DROP CONSTRAINT IF EXISTS "order_items_variant_id_variants_id_fk";
ALTER TABLE IF EXISTS ONLY "public"."order_items" DROP CONSTRAINT IF EXISTS "order_items_product_id_products_id_fk";
ALTER TABLE IF EXISTS ONLY "public"."order_items" DROP CONSTRAINT IF EXISTS "order_items_order_id_orders_id_fk";
ALTER TABLE IF EXISTS ONLY "public"."addresses" DROP CONSTRAINT IF EXISTS "addresses_user_id_users_id_fk";
ALTER TABLE IF EXISTS ONLY "public"."wishlists" DROP CONSTRAINT IF EXISTS "wishlists_user_id_product_id_unique";
ALTER TABLE IF EXISTS ONLY "public"."wishlists" DROP CONSTRAINT IF EXISTS "wishlists_pkey";
ALTER TABLE IF EXISTS ONLY "public"."variants" DROP CONSTRAINT IF EXISTS "variants_sku_unique";
ALTER TABLE IF EXISTS ONLY "public"."variants" DROP CONSTRAINT IF EXISTS "variants_pkey";
ALTER TABLE IF EXISTS ONLY "public"."users" DROP CONSTRAINT IF EXISTS "users_referral_code_unique";
ALTER TABLE IF EXISTS ONLY "public"."users" DROP CONSTRAINT IF EXISTS "users_pkey";
ALTER TABLE IF EXISTS ONLY "public"."users" DROP CONSTRAINT IF EXISTS "users_email_unique";
ALTER TABLE IF EXISTS ONLY "public"."reviews" DROP CONSTRAINT IF EXISTS "reviews_pkey";
ALTER TABLE IF EXISTS ONLY "public"."referrals" DROP CONSTRAINT IF EXISTS "referrals_pkey";
ALTER TABLE IF EXISTS ONLY "public"."referrals" DROP CONSTRAINT IF EXISTS "referrals_code_unique";
ALTER TABLE IF EXISTS ONLY "public"."products" DROP CONSTRAINT IF EXISTS "products_pkey";
ALTER TABLE IF EXISTS ONLY "public"."payments" DROP CONSTRAINT IF EXISTS "payments_reference_unique";
ALTER TABLE IF EXISTS ONLY "public"."payments" DROP CONSTRAINT IF EXISTS "payments_pkey";
ALTER TABLE IF EXISTS ONLY "public"."orders" DROP CONSTRAINT IF EXISTS "orders_pkey";
ALTER TABLE IF EXISTS ONLY "public"."order_items" DROP CONSTRAINT IF EXISTS "order_items_pkey";
ALTER TABLE IF EXISTS ONLY "public"."contact_requests" DROP CONSTRAINT IF EXISTS "contact_requests_pkey";
ALTER TABLE IF EXISTS ONLY "public"."contact_messages" DROP CONSTRAINT IF EXISTS "contact_messages_pkey";
ALTER TABLE IF EXISTS ONLY "public"."categories" DROP CONSTRAINT IF EXISTS "categories_slug_unique";
ALTER TABLE IF EXISTS ONLY "public"."categories" DROP CONSTRAINT IF EXISTS "categories_pkey";
ALTER TABLE IF EXISTS ONLY "public"."banners" DROP CONSTRAINT IF EXISTS "banners_pkey";
ALTER TABLE IF EXISTS ONLY "public"."addresses" DROP CONSTRAINT IF EXISTS "addresses_pkey";
DROP TABLE IF EXISTS "public"."wishlists";
DROP TABLE IF EXISTS "public"."variants";
DROP TABLE IF EXISTS "public"."users";
DROP TABLE IF EXISTS "public"."reviews";
DROP TABLE IF EXISTS "public"."referrals";
DROP TABLE IF EXISTS "public"."products";
DROP TABLE IF EXISTS "public"."payments";
DROP TABLE IF EXISTS "public"."orders";
DROP TABLE IF EXISTS "public"."order_items";
DROP TABLE IF EXISTS "public"."contact_requests";
DROP TABLE IF EXISTS "public"."contact_messages";
DROP TABLE IF EXISTS "public"."categories";
DROP TABLE IF EXISTS "public"."banners";
DROP TABLE IF EXISTS "public"."addresses";
DROP TYPE IF EXISTS "public"."role";
DROP TYPE IF EXISTS "public"."order_status";
--
-- Name: SCHEMA "public"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA "public" IS 'standard public schema';


--
-- Name: order_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE "public"."order_status" AS ENUM (
    'pending',
    'paid',
    'shipped',
    'processing',
    'delivered',
    'cancelled'
);


--
-- Name: role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE "public"."role" AS ENUM (
    'customer',
    'admin'
);


SET default_tablespace = '';

SET default_table_access_method = "heap";

--
-- Name: addresses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."addresses" (
    "id" character varying(20) NOT NULL,
    "user_id" "text" NOT NULL,
    "first_name" "text" NOT NULL,
    "last_name" "text" NOT NULL,
    "phone" "text" NOT NULL,
    "address_line" "text" NOT NULL,
    "city" "text" NOT NULL,
    "state" "text" NOT NULL,
    "postal_code" "text",
    "is_default" boolean DEFAULT false,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


--
-- Name: banners; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."banners" (
    "id" character varying(20) NOT NULL,
    "name" "text" NOT NULL,
    "page" "text" NOT NULL,
    "section" "text" NOT NULL,
    "url" "text" NOT NULL,
    "click_url" "text",
    "position" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."categories" (
    "id" character varying(20) NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "slug" "text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


--
-- Name: contact_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."contact_messages" (
    "id" character varying(20) NOT NULL,
    "name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "phone" "text",
    "message" "text" NOT NULL,
    "status" "text" DEFAULT 'unread'::"text",
    "created_at" timestamp without time zone DEFAULT "now"()
);


--
-- Name: contact_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."contact_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "first_name" "text" NOT NULL,
    "last_name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "phone" character varying(20) NOT NULL,
    "request_content" "text" NOT NULL,
    "status" "text" DEFAULT 'new'::"text",
    "created_at" timestamp without time zone DEFAULT "now"()
);


--
-- Name: order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."order_items" (
    "id" character varying(20) NOT NULL,
    "order_id" character varying(20) NOT NULL,
    "variant_id" character varying(20),
    "quantity" integer DEFAULT 1,
    "price_at_purchase_ngn" numeric(10,2) CONSTRAINT "order_items_price_at_purchase_not_null" NOT NULL,
    "price_at_purchase_usd" numeric(10,2) NOT NULL,
    "product_id" character varying(20) NOT NULL,
    "variant_name" "text"
);


--
-- Name: orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."orders" (
    "id" character varying(20) NOT NULL,
    "user_id" "text" NOT NULL,
    "status" "public"."order_status" DEFAULT 'pending'::"public"."order_status",
    "payment_reference" "text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "total_amount_ngn" numeric(12,2) NOT NULL,
    "total_amount_usd" numeric(12,2) NOT NULL,
    "currency_paid" "text" DEFAULT 'NGN'::"text"
);


--
-- Name: payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."payments" (
    "id" character varying(20) NOT NULL,
    "user_id" "text" NOT NULL,
    "order_id" character varying(20),
    "reference" "text" NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "currency" "text" DEFAULT 'NGN'::"text",
    "status" "text" DEFAULT 'pending'::"text",
    "metadata" "jsonb",
    "created_at" timestamp without time zone DEFAULT "now"()
);


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."products" (
    "id" character varying(20) NOT NULL,
    "category_id" character varying(20),
    "title" "text" NOT NULL,
    "description" "text" NOT NULL,
    "price_ngn" numeric(10,2) CONSTRAINT "products_base_price_not_null" NOT NULL,
    "compare_at_price_ngn" numeric(10,2),
    "gallery" "jsonb" DEFAULT '[]'::"jsonb",
    "tags" "jsonb" DEFAULT '[]'::"jsonb",
    "is_hot" boolean DEFAULT false,
    "is_active" boolean DEFAULT true,
    "avg_rating" numeric(3,2) DEFAULT '0'::numeric,
    "total_reviews" integer DEFAULT 0,
    "features" "text",
    "shipping_policy" "text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "price_usd" numeric(10,2) NOT NULL,
    "compare_at_price_usd" numeric(10,2),
    "stock_quantity" integer DEFAULT 0,
    "options" "jsonb" DEFAULT '[]'::"jsonb"
);


--
-- Name: referrals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."referrals" (
    "id" character varying(20) NOT NULL,
    "referrer_id" character varying(36) NOT NULL,
    "referee_id" character varying(36),
    "code" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text",
    "reward_amount" integer DEFAULT 0,
    "created_at" timestamp without time zone DEFAULT "now"()
);


--
-- Name: reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."reviews" (
    "id" character varying(20) NOT NULL,
    "user_id" character varying(20),
    "product_id" character varying(20),
    "rating" integer NOT NULL,
    "content" "text",
    "customer_photo_url" "text",
    "created_at" timestamp without time zone DEFAULT "now"()
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."users" (
    "id" "text" NOT NULL,
    "first_name" "text" NOT NULL,
    "last_name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "password" "text",
    "phone" "text",
    "address" "text",
    "role" "public"."role" DEFAULT 'customer'::"public"."role" NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "birthday" timestamp without time zone,
    "notify_email" boolean DEFAULT true,
    "notify_phone" boolean DEFAULT true,
    "referral_code" "text"
);


--
-- Name: variants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."variants" (
    "id" character varying(20) NOT NULL,
    "product_id" character varying(20) NOT NULL,
    "name" "text" NOT NULL,
    "attributes" "jsonb" NOT NULL,
    "price_override_ngn" numeric(10,2),
    "stock_quantity" integer DEFAULT 0,
    "sku" "text",
    "price_override_usd" numeric(10,2),
    "image" "text"
);


--
-- Name: wishlists; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."wishlists" (
    "id" character varying(20) NOT NULL,
    "user_id" character varying(36) NOT NULL,
    "product_id" character varying(20) NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"()
);


--
-- Data for Name: addresses; Type: TABLE DATA; Schema: public; Owner: -
--

COPY "public"."addresses" ("id", "user_id", "first_name", "last_name", "phone", "address_line", "city", "state", "postal_code", "is_default", "created_at", "updated_at") FROM stdin;
VINADDR-M6AEOL	5088bad5-84d1-4e6e-9b6f-721bc2ec4679	Sage	Ikemba	9087234521	new place	lagos	Lagos	100234	t	2025-12-19 13:29:33.64882	2025-12-19 13:29:33.64882
VINADDR-PGYBIB	48c0164f-eaa5-42f3-a572-755f8f03c6c7	wewe	rew	9123431245	bush at the begeine	bush city	Rivers	123432	f	2025-12-20 21:53:51.763315	2025-12-20 21:53:51.763315
VINADDR-BTFFK1	48c0164f-eaa5-42f3-a572-755f8f03c6c7	Ikemba	Chibueze	8123456789	Plot 32 off fela shrine	lagos	Lagos	100234	t	2025-12-19 14:17:03.339366	2025-12-20 21:54:05.94
VINADDR-YRFUTN	e83d8cf4-8bd2-4954-b5e7-87e974b2f56b	Mazi	Nwakaeze	09045692072	90, Akanro street ilasamaja, Mushin	Mushin	Lagos	100001	t	2026-01-05 16:23:08.493984	2026-01-05 16:23:08.493984
VINADDR-HXREJI	e83d8cf4-8bd2-4954-b5e7-87e974b2f56b	Mazi	Nwakaeze	09045692072	90, Akanro street ilasamaja, Mushin	Mushin	Lagos	100001	f	2026-01-05 16:47:30.242415	2026-01-05 16:47:30.242415
VINADDR-5DSKO2	23fc2eb2-8ff0-472a-935b-9a2c1e511f88	Mazi	Nwakaeze	09045692072	90, Akanro street ilasamaja, Mushin	Mushin	Lagos	100001	t	2026-01-05 17:28:41.403768	2026-01-05 17:28:41.403768
VINADDR-I01DA4	54d97d7e-694b-4fa1-9c2e-2351eb1fb019	Chibueze	another	8123456789	Plot 32 off fela shrine	lagos	Lagos	100234	t	2026-01-12 09:23:10.821055	2026-01-12 09:23:10.821055
VINADDR-Z90ZV5	a77efdd1-5da8-4db0-907c-b2199a6e3d6e	Emmanuel	Law	7012345678	2A Old road Okota Palace Way	Okota	Lagos	1000923	t	2026-01-12 15:40:53.946588	2026-01-12 15:40:53.946588
\.


--
-- Data for Name: banners; Type: TABLE DATA; Schema: public; Owner: -
--

COPY "public"."banners" ("id", "name", "page", "section", "url", "click_url", "position", "is_active", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: -
--

COPY "public"."categories" ("id", "name", "description", "slug", "created_at", "updated_at") FROM stdin;
VINCAT-EG8PHR	Extensions	Luxury hair extensions	extensions	2025-12-16 10:17:47.105094	2025-12-16 10:17:47.105094
VINCAT-DTZW4H	Care Products	Shampoos and conditioners	care	2025-12-16 10:17:47.225627	2025-12-16 10:17:47.225627
VINCAT-PJDOCI	Long hair		\N	2025-12-19 14:25:39.317522	2025-12-19 14:25:39.317522
\.


--
-- Data for Name: contact_messages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY "public"."contact_messages" ("id", "name", "email", "phone", "message", "status", "created_at") FROM stdin;
\.


--
-- Data for Name: contact_requests; Type: TABLE DATA; Schema: public; Owner: -
--

COPY "public"."contact_requests" ("id", "first_name", "last_name", "email", "phone", "request_content", "status", "created_at") FROM stdin;
067f4d95-e697-4444-a066-e4ca5ac9b735	Sage	does	new@mail.com	08045643212	I want to reqest for bone straight brazilian	resolved	2025-12-22 21:19:53.324333
ed88951d-5fb6-499f-ac02-4bdad8467bf7	Chibueze	Ikemba	mail@gmail.com	08123456789	I want brazillian red 18 inches wig	resolved	2026-01-12 09:18:41.416245
\.


--
-- Data for Name: order_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY "public"."order_items" ("id", "order_id", "variant_id", "quantity", "price_at_purchase_ngn", "price_at_purchase_usd", "product_id", "variant_name") FROM stdin;
VINITM-9KQNA2	VINORD-Q4MZNR	\N	1	56194.00	41.00	VINPROD-81U60N	\N
VINITM-R4ZE8R	VINORD-0R1X2Q	\N	1	56194.00	41.00	VINPROD-81U60N	\N
VINITM-111BVS	VINORD-4GQE56	\N	1	48687.00	32.00	VINPROD-ZS94O4	\N
VINITM-Y6QYSJ	VINORD-T2IFL3	\N	1	48687.00	32.00	VINPROD-ZS94O4	\N
VINITM-GBJYUO	VINORD-M03JZW	\N	1	48687.00	32.00	VINPROD-ZS94O4	\N
VINITM-8L70TB	VINORD-BZRBE3	VINVAR-K351BY	1	120000.00	85.00	VINPROD-9O90AX	\N
VINITM-7TEUYZ	VINORD-7FARCI	\N	1	318234.00	212.00	VINPROD-ZUQ6DV	\N
VINITM-OEAQZM	VINORD-7FARCI	VINVAR-Q4VNPY	1	318234.00	212.00	VINPROD-ZUQ6DV	Standard
VINITM-CMYNTF	VINORD-7FARCI	VINVAR-7FZD6L	2	123718.00	82.00	VINPROD-9OMDBC	Standard
VINITM-OILNNX	VINORD-7FARCI	VINVAR-I7JGQS	1	48687.00	32.00	VINPROD-ZS94O4	Standard
VINITM-KRHZ7A	VINORD-7FARCI	VINVAR-H2XO8F	1	56194.00	41.00	VINPROD-81U60N	Standard
VINITM-E3EMEG	VINORD-7FARCI	VINVAR-K4CAYG	1	126420.00	80.00	VINPROD-L6II7B	Standard
VINITM-F1AAF5	VINORD-YQ4R42	\N	1	318234.00	212.00	VINPROD-ZUQ6DV	\N
VINITM-GIHK9P	VINORD-YQ4R42	VINVAR-Q4VNPY	1	318234.00	212.00	VINPROD-ZUQ6DV	Standard
VINITM-A1P25N	VINORD-YQ4R42	VINVAR-7FZD6L	3	123718.00	82.00	VINPROD-9OMDBC	Standard
VINITM-QV2UY0	VINORD-YQ4R42	VINVAR-I7JGQS	2	48687.00	32.00	VINPROD-ZS94O4	Standard
VINITM-3IYZLL	VINORD-YQ4R42	VINVAR-H2XO8F	2	56194.00	41.00	VINPROD-81U60N	Standard
VINITM-WCZXIW	VINORD-YQ4R42	VINVAR-K4CAYG	1	126420.00	80.00	VINPROD-L6II7B	Standard
VINITM-15SKHV	VINORD-49T7LG	\N	1	318234.00	212.00	VINPROD-ZUQ6DV	\N
VINITM-X49K4B	VINORD-49T7LG	VINVAR-Q4VNPY	2	318234.00	212.00	VINPROD-ZUQ6DV	Standard
VINITM-KLROB3	VINORD-49T7LG	VINVAR-7FZD6L	4	123718.00	82.00	VINPROD-9OMDBC	Standard
VINITM-SAFNUA	VINORD-49T7LG	VINVAR-I7JGQS	3	48687.00	32.00	VINPROD-ZS94O4	Standard
VINITM-9O9FS6	VINORD-49T7LG	VINVAR-H2XO8F	3	56194.00	41.00	VINPROD-81U60N	Standard
VINITM-SJSDYZ	VINORD-49T7LG	VINVAR-K4CAYG	2	126420.00	80.00	VINPROD-L6II7B	Standard
VINITM-WTYGVB	VINORD-C1BQOK	\N	1	48687.00	32.00	VINPROD-ZS94O4	\N
VINITM-9E7D27	VINORD-2GZPHE	\N	3	318234.00	212.00	VINPROD-ZUQ6DV	\N
VINITM-1U0N8G	VINORD-2GZPHE	VINVAR-I91U6R	1	516720.00	344.00	VINPROD-9O90AX	blue / 14"
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: -
--

COPY "public"."orders" ("id", "user_id", "status", "payment_reference", "created_at", "total_amount_ngn", "total_amount_usd", "currency_paid") FROM stdin;
VINORD-Q4MZNR	5088bad5-84d1-4e6e-9b6f-721bc2ec4679	pending	\N	2025-12-19 12:41:21.022049	81194.00	61.00	NGN
VINORD-0R1X2Q	5088bad5-84d1-4e6e-9b6f-721bc2ec4679	shipped	\N	2025-12-19 12:48:21.956893	81194.00	61.00	NGN
VINORD-4GQE56	48c0164f-eaa5-42f3-a572-755f8f03c6c7	delivered	\N	2025-12-19 14:19:26.263316	73687.00	52.00	NGN
VINORD-T2IFL3	48c0164f-eaa5-42f3-a572-755f8f03c6c7	paid	\N	2025-12-19 14:29:48.401488	73687.00	52.00	USD
VINORD-M03JZW	48c0164f-eaa5-42f3-a572-755f8f03c6c7	pending	\N	2025-12-19 14:30:41.40727	73687.00	52.00	NGN
VINORD-7FARCI	e83d8cf4-8bd2-4954-b5e7-87e974b2f56b	paid	\N	2026-01-05 16:52:56.072517	1115205.00	741.00	USD
VINORD-BZRBE3	48c0164f-eaa5-42f3-a572-755f8f03c6c7	shipped	\N	2025-12-23 22:31:26.213938	145000.00	105.00	NGN
VINORD-49T7LG	0c91948b-d7a3-427b-b5ff-2f2bab25e01f	delivered	\N	2026-01-06 17:35:01.617731	2017057.00	1343.00	USD
VINORD-YQ4R42	e83d8cf4-8bd2-4954-b5e7-87e974b2f56b	delivered	\N	2026-01-05 17:39:59.153066	1343804.00	896.00	USD
VINORD-C1BQOK	48c0164f-eaa5-42f3-a572-755f8f03c6c7	pending	\N	2026-01-12 15:27:41.665469	48687.00	32.00	USD
VINORD-2GZPHE	48c0164f-eaa5-42f3-a572-755f8f03c6c7	shipped	\N	2026-01-12 15:47:31.335452	1471422.00	980.00	USD
\.


--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY "public"."payments" ("id", "user_id", "order_id", "reference", "amount", "currency", "status", "metadata", "created_at") FROM stdin;
VINPAY-SPKZD9	5088bad5-84d1-4e6e-9b6f-721bc2ec4679	VINORD-0R1X2Q	9gz9ny508j	81194.00	NGN	success	{"id": 5652453998, "log": {"input": [], "errors": 0, "mobile": false, "history": [{"time": 1, "type": "pending", "message": "Payment in progress with bank"}, {"time": 7, "type": "action", "message": "Set payment method to: card"}, {"time": 10, "type": "action", "message": "Attempted to pay with card"}, {"time": 11, "type": "success", "message": "Successfully paid with card"}], "success": true, "attempts": 1, "start_time": 1766148507, "time_spent": 11}, "fees": 131791, "plan": null, "split": {}, "amount": 8119400, "domain": "test", "paidAt": "2025-12-19T12:48:38.000Z", "source": null, "status": "success", "channel": "card", "connect": null, "message": null, "paid_at": "2025-12-19T12:48:38.000Z", "currency": "NGN", "customer": {"id": 326934468, "email": "old@mail.com", "phone": null, "metadata": null, "last_name": null, "first_name": null, "risk_action": "default", "customer_code": "CUS_r6fdz3441ea29e0", "international_format_phone": null}, "metadata": {"userId": "5088bad5-84d1-4e6e-9b6f-721bc2ec4679", "orderId": "VINORD-0R1X2Q", "referrer": "https://vintagefrontend-i6mpc.ondigitalocean.app/"}, "order_id": null, "createdAt": "2025-12-19T12:48:22.000Z", "reference": "9gz9ny508j", "created_at": "2025-12-19T12:48:22.000Z", "fees_split": null, "ip_address": "102.212.232.54", "subaccount": {}, "plan_object": {}, "authorization": {"bin": "408408", "bank": "TEST BANK", "brand": "visa", "last4": "4081", "channel": "card", "exp_year": "2030", "reusable": true, "card_type": "visa ", "exp_month": "12", "signature": "SIG_ag17rBtrCbyNQaRqdWAM", "account_name": null, "country_code": "NG", "receiver_bank": null, "authorization_code": "AUTH_rkkad2y7uw", "receiver_bank_account_number": null}, "fees_breakdown": null, "receipt_number": null, "gateway_response": "Successful", "requested_amount": 8119400, "transaction_date": "2025-12-19T12:48:22.000Z", "pos_transaction_data": null}	2025-12-19 12:48:22.481397
VINPAY-2357JL	48c0164f-eaa5-42f3-a572-755f8f03c6c7	VINORD-4GQE56	9t1rkvctfd	73687.00	NGN	success	{"id": 5652644102, "log": {"input": [], "errors": 0, "mobile": false, "history": [{"time": 10, "type": "action", "message": "Attempted to pay with card"}, {"time": 10, "type": "success", "message": "Successfully paid with card"}], "success": true, "attempts": 1, "start_time": 1766153972, "time_spent": 10}, "fees": 120531, "plan": null, "split": {}, "amount": 7368700, "domain": "test", "paidAt": "2025-12-19T14:19:42.000Z", "source": null, "status": "success", "channel": "card", "connect": null, "message": null, "paid_at": "2025-12-19T14:19:42.000Z", "currency": "NGN", "customer": {"id": 326953830, "email": "ikemba@mail.com", "phone": null, "metadata": null, "last_name": null, "first_name": null, "risk_action": "default", "customer_code": "CUS_qyyz85b2dh43e23", "international_format_phone": null}, "metadata": {"userId": "48c0164f-eaa5-42f3-a572-755f8f03c6c7", "orderId": "VINORD-4GQE56", "referrer": "https://vintagefrontend-i6mpc.ondigitalocean.app/"}, "order_id": null, "createdAt": "2025-12-19T14:19:26.000Z", "reference": "9t1rkvctfd", "created_at": "2025-12-19T14:19:26.000Z", "fees_split": null, "ip_address": "102.212.232.54", "subaccount": {}, "plan_object": {}, "authorization": {"bin": "408408", "bank": "TEST BANK", "brand": "visa", "last4": "4081", "channel": "card", "exp_year": "2030", "reusable": true, "card_type": "visa ", "exp_month": "12", "signature": "SIG_ag17rBtrCbyNQaRqdWAM", "account_name": null, "country_code": "NG", "receiver_bank": null, "authorization_code": "AUTH_jxadfr28rx", "receiver_bank_account_number": null}, "fees_breakdown": null, "receipt_number": null, "gateway_response": "Successful", "requested_amount": 7368700, "transaction_date": "2025-12-19T14:19:26.000Z", "pos_transaction_data": null}	2025-12-19 14:19:26.778592
VINPAY-C5GZNQ	48c0164f-eaa5-42f3-a572-755f8f03c6c7	VINORD-T2IFL3	g4ztbphqq5	52.00	USD	success	{"id": 5652664019, "log": {"input": [], "errors": 0, "mobile": false, "history": [{"time": 18, "type": "action", "message": "Attempted to pay with card"}, {"time": 18, "type": "success", "message": "Successfully paid with card"}], "success": true, "attempts": 1, "start_time": 1766154591, "time_spent": 18}, "fees": 203, "plan": null, "split": {}, "amount": 5200, "domain": "test", "paidAt": "2025-12-19T14:30:09.000Z", "source": null, "status": "success", "channel": "card", "connect": null, "message": null, "paid_at": "2025-12-19T14:30:09.000Z", "currency": "USD", "customer": {"id": 326953830, "email": "ikemba@mail.com", "phone": null, "metadata": null, "last_name": null, "first_name": null, "risk_action": "default", "customer_code": "CUS_qyyz85b2dh43e23", "international_format_phone": null}, "metadata": {"userId": "48c0164f-eaa5-42f3-a572-755f8f03c6c7", "orderId": "VINORD-T2IFL3", "referrer": "https://vintagefrontend-i6mpc.ondigitalocean.app/"}, "order_id": null, "createdAt": "2025-12-19T14:29:48.000Z", "reference": "g4ztbphqq5", "created_at": "2025-12-19T14:29:48.000Z", "fees_split": null, "ip_address": "102.212.232.54", "subaccount": {}, "plan_object": {}, "authorization": {"bin": "408408", "bank": "TEST BANK", "brand": "visa", "last4": "4081", "channel": "card", "exp_year": "2030", "reusable": true, "card_type": "visa ", "exp_month": "12", "signature": "SIG_ag17rBtrCbyNQaRqdWAM", "account_name": null, "country_code": "NG", "receiver_bank": null, "authorization_code": "AUTH_cfdpuxmijc", "receiver_bank_account_number": null}, "fees_breakdown": null, "receipt_number": null, "gateway_response": "Successful", "requested_amount": 5200, "transaction_date": "2025-12-19T14:29:48.000Z", "pos_transaction_data": null}	2025-12-19 14:29:48.703605
VINPAY-HN6LL7	48c0164f-eaa5-42f3-a572-755f8f03c6c7	VINORD-M03JZW	3t6pvkgh8j	73687.00	NGN	pending	\N	2025-12-19 14:30:41.754579
VINPAY-LR9FJS	48c0164f-eaa5-42f3-a572-755f8f03c6c7	VINORD-BZRBE3	7r10u19eqe	145000.00	NGN	success	{"id": 5666356819, "log": {"input": [], "errors": 0, "mobile": false, "history": [{"time": 5, "type": "action", "message": "Attempted to pay with card"}, {"time": 8, "type": "success", "message": "Successfully paid with card"}], "success": true, "attempts": 1, "start_time": 1766529095, "time_spent": 8}, "fees": 200000, "plan": null, "split": {}, "amount": 14500000, "domain": "test", "paidAt": "2025-12-23T22:31:42.000Z", "source": null, "status": "success", "channel": "card", "connect": null, "message": null, "paid_at": "2025-12-23T22:31:42.000Z", "currency": "NGN", "customer": {"id": 326953830, "email": "ikemba@mail.com", "phone": null, "metadata": null, "last_name": null, "first_name": null, "risk_action": "default", "customer_code": "CUS_qyyz85b2dh43e23", "international_format_phone": null}, "metadata": {"userId": "48c0164f-eaa5-42f3-a572-755f8f03c6c7", "orderId": "VINORD-BZRBE3", "referrer": "http://localhost:3001/"}, "order_id": null, "createdAt": "2025-12-23T22:31:27.000Z", "reference": "7r10u19eqe", "created_at": "2025-12-23T22:31:27.000Z", "fees_split": null, "ip_address": "102.212.232.54", "subaccount": {}, "plan_object": {}, "authorization": {"bin": "408408", "bank": "TEST BANK", "brand": "visa", "last4": "4081", "channel": "card", "exp_year": "2030", "reusable": true, "card_type": "visa ", "exp_month": "12", "signature": "SIG_ag17rBtrCbyNQaRqdWAM", "account_name": null, "country_code": "NG", "receiver_bank": null, "authorization_code": "AUTH_fv8jgt6i96", "receiver_bank_account_number": null}, "fees_breakdown": null, "receipt_number": null, "gateway_response": "Successful", "requested_amount": 14500000, "transaction_date": "2025-12-23T22:31:27.000Z", "pos_transaction_data": null}	2025-12-23 22:31:28.04304
VINPAY-3TCMYE	e83d8cf4-8bd2-4954-b5e7-87e974b2f56b	VINORD-7FARCI	zd13vhzfd6	741.00	USD	success	{"id": 5706234453, "log": {"input": [], "errors": 0, "mobile": false, "history": [{"time": 13, "type": "action", "message": "Attempted to pay with card"}, {"time": 14, "type": "success", "message": "Successfully paid with card"}], "success": true, "attempts": 1, "start_time": 1767631978, "time_spent": 14}, "fees": 2890, "plan": null, "split": {}, "amount": 74100, "domain": "test", "paidAt": "2026-01-05T16:53:14.000Z", "source": null, "status": "success", "channel": "card", "connect": null, "message": null, "paid_at": "2026-01-05T16:53:14.000Z", "currency": "USD", "customer": {"id": 330287770, "email": "mazizobo@gmail.com", "phone": null, "metadata": null, "last_name": null, "first_name": null, "risk_action": "default", "customer_code": "CUS_kryefibpdwknyhv", "international_format_phone": null}, "metadata": {"userId": "e83d8cf4-8bd2-4954-b5e7-87e974b2f56b", "orderId": "VINORD-7FARCI", "referrer": "http://localhost:3000/"}, "order_id": null, "createdAt": "2026-01-05T16:52:56.000Z", "reference": "zd13vhzfd6", "created_at": "2026-01-05T16:52:56.000Z", "fees_split": null, "ip_address": "102.89.34.49", "subaccount": {}, "plan_object": {}, "authorization": {"bin": "408408", "bank": "TEST BANK", "brand": "visa", "last4": "4081", "channel": "card", "exp_year": "2030", "reusable": true, "card_type": "visa ", "exp_month": "12", "signature": "SIG_ag17rBtrCbyNQaRqdWAM", "account_name": null, "country_code": "NG", "receiver_bank": null, "authorization_code": "AUTH_v72ayit7tf", "receiver_bank_account_number": null}, "fees_breakdown": null, "receipt_number": null, "gateway_response": "Successful", "requested_amount": 74100, "transaction_date": "2026-01-05T16:52:56.000Z", "pos_transaction_data": null}	2026-01-05 16:52:56.556952
VINPAY-T7JVD5	e83d8cf4-8bd2-4954-b5e7-87e974b2f56b	VINORD-YQ4R42	7ygumme0km	896.00	USD	success	{"id": 5706356900, "log": {"input": [], "errors": 0, "mobile": false, "history": [{"time": 5, "type": "action", "message": "Attempted to pay with card"}, {"time": 7, "type": "success", "message": "Successfully paid with card"}], "success": true, "attempts": 1, "start_time": 1767634799, "time_spent": 7}, "fees": 3495, "plan": null, "split": {}, "amount": 89600, "domain": "test", "paidAt": "2026-01-05T17:40:08.000Z", "source": null, "status": "success", "channel": "card", "connect": null, "message": null, "paid_at": "2026-01-05T17:40:08.000Z", "currency": "USD", "customer": {"id": 330287770, "email": "mazizobo@gmail.com", "phone": null, "metadata": null, "last_name": null, "first_name": null, "risk_action": "default", "customer_code": "CUS_kryefibpdwknyhv", "international_format_phone": null}, "metadata": {"userId": "e83d8cf4-8bd2-4954-b5e7-87e974b2f56b", "orderId": "VINORD-YQ4R42", "referrer": "http://localhost:3000/"}, "order_id": null, "createdAt": "2026-01-05T17:39:59.000Z", "reference": "7ygumme0km", "created_at": "2026-01-05T17:39:59.000Z", "fees_split": null, "ip_address": "102.89.34.49", "subaccount": {}, "plan_object": {}, "authorization": {"bin": "408408", "bank": "TEST BANK", "brand": "visa", "last4": "4081", "channel": "card", "exp_year": "2030", "reusable": true, "card_type": "visa ", "exp_month": "12", "signature": "SIG_ag17rBtrCbyNQaRqdWAM", "account_name": null, "country_code": "NG", "receiver_bank": null, "authorization_code": "AUTH_f58srwsvtr", "receiver_bank_account_number": null}, "fees_breakdown": null, "receipt_number": null, "gateway_response": "Successful", "requested_amount": 89600, "transaction_date": "2026-01-05T17:39:59.000Z", "pos_transaction_data": null}	2026-01-05 17:39:59.627218
VINPAY-RGXFHI	0c91948b-d7a3-427b-b5ff-2f2bab25e01f	VINORD-49T7LG	4g8ouaz3d9	1343.00	USD	success	{"id": 5709790418, "log": {"input": [], "errors": 0, "mobile": false, "history": [{"time": 4, "type": "action", "message": "Attempted to pay with card"}, {"time": 5, "type": "success", "message": "Successfully paid with card"}], "success": true, "attempts": 1, "start_time": 1767720904, "time_spent": 5}, "fees": 5238, "plan": null, "split": {}, "amount": 134300, "domain": "test", "paidAt": "2026-01-06T17:35:09.000Z", "source": null, "status": "success", "channel": "card", "connect": null, "message": null, "paid_at": "2026-01-06T17:35:09.000Z", "currency": "USD", "customer": {"id": 330521061, "email": "mazi@vastracktech.com.ng", "phone": null, "metadata": null, "last_name": null, "first_name": null, "risk_action": "default", "customer_code": "CUS_qjdvws3ux5z6ii9", "international_format_phone": null}, "metadata": {"userId": "0c91948b-d7a3-427b-b5ff-2f2bab25e01f", "orderId": "VINORD-49T7LG", "referrer": "http://localhost:3000/"}, "order_id": null, "createdAt": "2026-01-06T17:35:02.000Z", "reference": "4g8ouaz3d9", "created_at": "2026-01-06T17:35:02.000Z", "fees_split": null, "ip_address": "154.113.194.2", "subaccount": {}, "plan_object": {}, "authorization": {"bin": "408408", "bank": "TEST BANK", "brand": "visa", "last4": "4081", "channel": "card", "exp_year": "2030", "reusable": true, "card_type": "visa ", "exp_month": "12", "signature": "SIG_ag17rBtrCbyNQaRqdWAM", "account_name": null, "country_code": "NG", "receiver_bank": null, "authorization_code": "AUTH_s7uijrw6k8", "receiver_bank_account_number": null}, "fees_breakdown": null, "receipt_number": null, "gateway_response": "Successful", "requested_amount": 134300, "transaction_date": "2026-01-06T17:35:02.000Z", "pos_transaction_data": null}	2026-01-06 17:35:02.330352
VINPAY-87WOYE	48c0164f-eaa5-42f3-a572-755f8f03c6c7	VINORD-C1BQOK	wn98j6l5fh	32.00	USD	pending	\N	2026-01-12 15:27:42.083727
VINPAY-WXQRNU	48c0164f-eaa5-42f3-a572-755f8f03c6c7	VINORD-2GZPHE	pyi50ex2ax	980.00	USD	success	{"id": 5728846826, "log": {"input": [], "errors": 0, "mobile": false, "history": [{"time": 22, "type": "action", "message": "Attempted to pay with card"}, {"time": 23, "type": "success", "message": "Successfully paid with card"}], "success": true, "attempts": 1, "start_time": 1768232855, "time_spent": 23}, "fees": 3822, "plan": null, "split": {}, "amount": 98000, "domain": "test", "paidAt": "2026-01-12T15:47:57.000Z", "source": null, "status": "success", "channel": "card", "connect": null, "message": null, "paid_at": "2026-01-12T15:47:57.000Z", "currency": "USD", "customer": {"id": 326953830, "email": "ikemba@mail.com", "phone": null, "metadata": null, "last_name": null, "first_name": null, "risk_action": "default", "customer_code": "CUS_qyyz85b2dh43e23", "international_format_phone": null}, "metadata": {"userId": "48c0164f-eaa5-42f3-a572-755f8f03c6c7", "orderId": "VINORD-2GZPHE", "referrer": "https://vintagefrontend-i6mpc.ondigitalocean.app/"}, "order_id": null, "createdAt": "2026-01-12T15:47:31.000Z", "reference": "pyi50ex2ax", "created_at": "2026-01-12T15:47:31.000Z", "fees_split": null, "ip_address": "102.67.5.3", "subaccount": {}, "plan_object": {}, "authorization": {"bin": "408408", "bank": "TEST BANK", "brand": "visa", "last4": "4081", "channel": "card", "exp_year": "2030", "reusable": true, "card_type": "visa ", "exp_month": "12", "signature": "SIG_ag17rBtrCbyNQaRqdWAM", "account_name": null, "country_code": "NG", "receiver_bank": null, "authorization_code": "AUTH_wvkzl7dl9a", "receiver_bank_account_number": null}, "fees_breakdown": null, "receipt_number": null, "gateway_response": "Successful", "requested_amount": 98000, "transaction_date": "2026-01-12T15:47:31.000Z", "pos_transaction_data": null}	2026-01-12 15:47:31.646039
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: -
--

COPY "public"."products" ("id", "category_id", "title", "description", "price_ngn", "compare_at_price_ngn", "gallery", "tags", "is_hot", "is_active", "avg_rating", "total_reviews", "features", "shipping_policy", "created_at", "updated_at", "price_usd", "compare_at_price_usd", "stock_quantity", "options") FROM stdin;
VINPROD-H6QRIX	VINCAT-EG8PHR	new product	New test	100.00	\N	["https://res.cloudinary.com/dognhv6wi/image/upload/v1768219641/l0ogrgx1vuqf0ohn35yi.jpg"]	[]	f	t	0.00	0	\N	\N	2026-01-12 12:07:28.62937	2026-01-12 12:16:37.267	10.00	\N	6	[{"name": "Color", "values": ["Black"]}, {"name": "Length", "values": ["14"]}]
VINPROD-L6II7B	VINCAT-DTZW4H	Vietnamese Kinky Long Hair	High quality Vietnamese hair in Kinky style.	126420.00	151704.00	["https://res.cloudinary.com/dognhv6wi/image/upload/v1766154156/c7brxbpsu1r7hvlesbn2.jpg"]	["Vietnamese", "Kinky", "Long", "Generated"]	t	t	3.30	0	\N	\N	2025-12-16 10:17:50.4671	2025-12-19 14:23:14.526	80.00	116.00	5	[]
VINPROD-HHTSU0	VINCAT-EG8PHR	Peruvian Straight Medium Hair	High quality Peruvian hair in Straight style.	382278.00	458733.00	["https://res.cloudinary.com/dognhv6wi/image/upload/v1766070701/tebccxobf4zonnjnsyto.jpg"]	["Peruvian", "Straight", "Medium", "Generated"]	f	t	3.90	5	\N	\N	2025-12-16 10:17:51.425635	2025-12-23 21:07:27.945	254.00	293.00	9	[]
VINPROD-ZUQ6DV	VINCAT-DTZW4H	Synthetic Curly Medium Hair	High quality Synthetic hair in Curly style.	318234.00	\N	["https://res.cloudinary.com/dognhv6wi/image/upload/v1766070982/fcuiw4rermkscq1xqt2a.jpg"]	["Synthetic", "Curly", "Medium", "Generated"]	t	t	4.50	3	\N	\N	2025-12-16 10:17:51.17966	2025-12-18 15:16:28.969	212.00	\N	0	[]
VINPROD-FWNVQQ	VINCAT-EG8PHR	Brazilian Wavy Short Hair	High quality Brazilian hair in Wavy style.	183573.00	\N	["https://res.cloudinary.com/dognhv6wi/image/upload/v1766071001/j1cgqep4awrkrszxslrf.jpg"]	["Brazilian", "Wavy", "Short", "Generated"]	t	t	4.20	44	\N	\N	2025-12-16 10:17:50.939367	2025-12-18 15:16:57.226	153.00	\N	10	[]
VINPROD-9O90AX	VINCAT-PJDOCI	Brazilian Curly Short Hair	High quality Brazilian hair in Curly style.	516720.00	620064.00	["https://res.cloudinary.com/dognhv6wi/image/upload/v1766070683/uxshwkbjou9yizmuncfo.jpg", "https://res.cloudinary.com/dognhv6wi/image/upload/v1766154931/yxrgnhs4cfwcoodgy2wa.jpg"]	["Brazilian", "Curly", "Short", "Generated"]	t	t	3.90	2	\N	\N	2025-12-16 10:17:51.65754	2026-01-12 09:30:13.818	344.00	413.00	16	[{"name": "Color", "values": ["red", "blue"]}, {"name": "Length", "values": ["14", "18"]}]
VINPROD-G17T87	VINCAT-EG8PHR	Peruvian Wavy Long Hair	High quality Peruvian hair in Wavy style.	435003.00	\N	["https://res.cloudinary.com/dognhv6wi/image/upload/v1766071433/mgpeoqwigec5istgs8be.jpg"]	["Peruvian", "Wavy", "Long", "Generated"]	f	t	3.60	38	\N	\N	2025-12-16 10:17:49.994105	2025-12-18 15:24:00.802	290.00	\N	10	[]
VINPROD-U4FV6M	VINCAT-EG8PHR	Vietnamese Kinky Short Hair	High quality Vietnamese hair in Kinky style.	229209.00	\N	["https://res.cloudinary.com/dognhv6wi/image/upload/v1766071565/in1dyjuyxp6emlhornyq.jpg"]	["Vietnamese", "Kinky", "Short", "Generated"]	f	t	4.10	38	\N	\N	2025-12-16 10:17:49.527355	2025-12-18 15:26:13.304	152.00	\N	10	[]
VINPROD-9OMDBC	VINCAT-DTZW4H	Synthetic Wavy Medium Hair	High quality Synthetic hair in Wavy style.	123718.00	148461.00	["https://res.cloudinary.com/dognhv6wi/image/upload/v1766071033/leldqa87c98c90idmxjq.jpg"]	["Synthetic", "Wavy", "Medium", "Generated"]	t	t	3.10	13	\N	\N	2025-12-16 10:17:50.708818	2025-12-18 15:17:23.395	82.00	98.00	1	[]
VINPROD-ZS94O4	VINCAT-DTZW4H	Peruvian Straight Medium Hair	High quality Peruvian hair in Straight style.	48687.00	58424.00	["https://res.cloudinary.com/dognhv6wi/image/upload/v1766071136/nfcltrblbij6rhij6bcg.jpg"]	["Peruvian", "Straight", "Medium", "Generated"]	f	t	4.90	8	\N	\N	2025-12-16 10:17:50.226414	2025-12-18 15:19:05.934	32.00	38.00	2	[]
VINPROD-81U60N	VINCAT-DTZW4H	Vietnamese Straight Short Hair	High quality Vietnamese hair in Straight style.	56194.00	\N	["https://res.cloudinary.com/dognhv6wi/image/upload/v1766071460/sxabw4zch5zjno19fhmg.jpg"]	["Vietnamese", "Straight", "Short", "Generated"]	t	t	4.40	35	\N	\N	2025-12-16 10:17:49.761844	2025-12-18 15:24:33.233	41.00	\N	3	[]
\.


--
-- Data for Name: referrals; Type: TABLE DATA; Schema: public; Owner: -
--

COPY "public"."referrals" ("id", "referrer_id", "referee_id", "code", "status", "reward_amount", "created_at") FROM stdin;
VINREF-R4EDFJ	87c5d6af-adf4-4749-aac9-b5174e54c38e	74bb5de8-d2f8-4583-97cc-03e08ec084c4	Refer-J5VYL9	completed	0	2025-12-16 11:26:29.823553
\.


--
-- Data for Name: reviews; Type: TABLE DATA; Schema: public; Owner: -
--

COPY "public"."reviews" ("id", "user_id", "product_id", "rating", "content", "customer_photo_url", "created_at") FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY "public"."users" ("id", "first_name", "last_name", "email", "password", "phone", "address", "role", "created_at", "updated_at", "birthday", "notify_email", "notify_phone", "referral_code") FROM stdin;
87c5d6af-adf4-4749-aac9-b5174e54c38e	Refer	Test	referal@mail.com	\N	\N	\N	customer	2025-12-16 11:20:17.148825	2025-12-16 11:20:17.148825	\N	t	t	Refer-J5VYL9
74bb5de8-d2f8-4583-97cc-03e08ec084c4	first	Referee	referee@mail.com	\N	\N	\N	customer	2025-12-16 11:26:29.823553	2025-12-16 11:26:29.823553	\N	t	t	first-M7EH3V
5088bad5-84d1-4e6e-9b6f-721bc2ec4679	Chibueze	Sage	old@mail.com	\N	+2348120234567	\N	admin	2025-12-19 12:40:20.285322	2025-12-19 13:28:45.869	2016-09-10 12:00:00	t	t	Chibueze-MDUSPJ
23fc2eb2-8ff0-472a-935b-9a2c1e511f88	Mazi	Nwakaeze	mcenigmaentertainment@gmail.com	\N	\N	\N	customer	2026-01-05 17:03:34.440036	2026-01-05 17:03:34.440036	\N	t	t	Mazi-0J4CCR
e83d8cf4-8bd2-4954-b5e7-87e974b2f56b	Mazi	Nwakaeze	mazizobo@gmail.com	\N	\N	\N	customer	2025-12-25 11:32:06.064708	2025-12-25 11:32:06.064708	\N	t	t	Mazi-1Z83FO
0c91948b-d7a3-427b-b5ff-2f2bab25e01f	James	Philip	mazi@vastracktech.com.ng	\N	\N	\N	customer	2026-01-06 17:09:20.119257	2026-01-06 17:09:20.119257	\N	t	t	James-2O8XBG
54d97d7e-694b-4fa1-9c2e-2351eb1fb019	Chibueze	another	demo@mail.com	\N	\N	\N	customer	2026-01-12 09:20:43.397853	2026-01-12 09:23:52.409	\N	t	t	Chibueze-3MY5C5
513af429-3a47-4c43-bad0-35899fc18f04	Live	Test	admin@vintage.com	\N	+2348123456789	\N	admin	2025-12-18 09:58:13.701804	2026-01-12 15:10:44.435	2011-12-16 12:00:00	t	t	Live-XM9QM4
48c0164f-eaa5-42f3-a572-755f8f03c6c7	Ikemba	Sage	ikemba@mail.com	\N	+234981234546	\N	customer	2025-12-19 14:15:34.898101	2026-01-12 15:25:23.274	2014-12-14 12:00:00	t	t	Ikemba-DWX5ZK
a77efdd1-5da8-4db0-907c-b2199a6e3d6e	Ola	Law	olalaw001@gmail.com	\N	\N	\N	customer	2026-01-12 15:32:25.156238	2026-01-12 15:41:25.686	\N	t	t	Ola-BHW2RQ
\.


--
-- Data for Name: variants; Type: TABLE DATA; Schema: public; Owner: -
--

COPY "public"."variants" ("id", "product_id", "name", "attributes", "price_override_ngn", "stock_quantity", "sku", "price_override_usd", "image") FROM stdin;
VINVAR-Q4VNPY	VINPROD-ZUQ6DV	Standard	{"color": "Natural", "length": "Standard"}	\N	6	SKU-ZUQ6DV	\N	\N
VINVAR-7FZD6L	VINPROD-9OMDBC	Standard	{"color": "Natural", "length": "Standard"}	\N	1	SKU-9OMDBC	\N	\N
VINVAR-I7JGQS	VINPROD-ZS94O4	Standard	{"color": "Natural", "length": "Standard"}	\N	4	SKU-ZS94O4	\N	\N
VINVAR-H2XO8F	VINPROD-81U60N	Standard	{"color": "Natural", "length": "Standard"}	\N	4	SKU-81U60N	\N	\N
VINVAR-K4CAYG	VINPROD-L6II7B	Standard	{}	\N	6	SKU-WNR0EN	\N	\N
VINVAR-K351BY	VINPROD-9O90AX	red / 14"	{"Color": "red", "Length": "14"}	120000.00	6	SKU-I1J172	85.00	https://res.cloudinary.com/dognhv6wi/image/upload/v1766070683/uxshwkbjou9yizmuncfo.jpg
VINVAR-XD3XEN	VINPROD-9O90AX	red / 18"	{"Color": "red", "Length": "18"}	150000.00	10	SKU-L2BTBA	100.00	https://res.cloudinary.com/dognhv6wi/image/upload/v1766154931/yxrgnhs4cfwcoodgy2wa.jpg
VINVAR-KZ8FDB	VINPROD-9O90AX	blue / 18"	{"Color": "blue", "Length": "18"}	\N	0	SKU-JXOUR9	\N	\N
VINVAR-AJE9R3	VINPROD-H6QRIX	Black / 14"	{"Color": "Black", "Length": "14"}	\N	6	SKU-GHBAKH	\N	\N
VINVAR-I91U6R	VINPROD-9O90AX	blue / 14"	{"Color": "blue", "Length": "14"}	\N	0	SKU-MGL5F4	\N	https://res.cloudinary.com/dognhv6wi/image/upload/v1766070683/uxshwkbjou9yizmuncfo.jpg
VINVAR-S6AR45	VINPROD-U4FV6M	Standard	{"color": "Natural", "length": "Standard"}	\N	10	SKU-U4FV6M	\N	\N
VINVAR-U55U2K	VINPROD-G17T87	Standard	{"color": "Natural", "length": "Standard"}	\N	10	SKU-G17T87	\N	\N
VINVAR-7TUJHY	VINPROD-FWNVQQ	Standard	{"color": "Natural", "length": "Standard"}	\N	10	SKU-FWNVQQ	\N	\N
VINVAR-XHGYQG	VINPROD-HHTSU0	Standard	{}	\N	10	SKU-7YTARB	\N	\N
\.


--
-- Data for Name: wishlists; Type: TABLE DATA; Schema: public; Owner: -
--

COPY "public"."wishlists" ("id", "user_id", "product_id", "created_at") FROM stdin;
VINWISH-463JWM	e83d8cf4-8bd2-4954-b5e7-87e974b2f56b	VINPROD-81U60N	2026-01-05 16:52:25.648497
VINWISH-R5O3FZ	e83d8cf4-8bd2-4954-b5e7-87e974b2f56b	VINPROD-9OMDBC	2026-01-05 16:52:29.669176
VINWISH-MVR9CN	e83d8cf4-8bd2-4954-b5e7-87e974b2f56b	VINPROD-ZS94O4	2026-01-05 16:52:35.443815
VINWISH-4Y9Q1B	e83d8cf4-8bd2-4954-b5e7-87e974b2f56b	VINPROD-L6II7B	2026-01-05 16:52:40.180421
VINWISH-XM5A8L	48c0164f-eaa5-42f3-a572-755f8f03c6c7	VINPROD-ZS94O4	2026-01-12 15:45:42.123476
VINWISH-MZ2ZBL	48c0164f-eaa5-42f3-a572-755f8f03c6c7	VINPROD-ZUQ6DV	2026-01-12 15:45:46.397289
VINWISH-8N6G2Y	48c0164f-eaa5-42f3-a572-755f8f03c6c7	VINPROD-G17T87	2026-01-12 15:45:51.14136
\.


--
-- Name: addresses addresses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."addresses"
    ADD CONSTRAINT "addresses_pkey" PRIMARY KEY ("id");


--
-- Name: banners banners_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."banners"
    ADD CONSTRAINT "banners_pkey" PRIMARY KEY ("id");


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("id");


--
-- Name: categories categories_slug_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_slug_unique" UNIQUE ("slug");


--
-- Name: contact_messages contact_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."contact_messages"
    ADD CONSTRAINT "contact_messages_pkey" PRIMARY KEY ("id");


--
-- Name: contact_requests contact_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."contact_requests"
    ADD CONSTRAINT "contact_requests_pkey" PRIMARY KEY ("id");


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_pkey" PRIMARY KEY ("id");


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_pkey" PRIMARY KEY ("id");


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_pkey" PRIMARY KEY ("id");


--
-- Name: payments payments_reference_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_reference_unique" UNIQUE ("reference");


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");


--
-- Name: referrals referrals_code_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."referrals"
    ADD CONSTRAINT "referrals_code_unique" UNIQUE ("code");


--
-- Name: referrals referrals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."referrals"
    ADD CONSTRAINT "referrals_pkey" PRIMARY KEY ("id");


--
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_pkey" PRIMARY KEY ("id");


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_unique" UNIQUE ("email");


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");


--
-- Name: users users_referral_code_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_referral_code_unique" UNIQUE ("referral_code");


--
-- Name: variants variants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."variants"
    ADD CONSTRAINT "variants_pkey" PRIMARY KEY ("id");


--
-- Name: variants variants_sku_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."variants"
    ADD CONSTRAINT "variants_sku_unique" UNIQUE ("sku");


--
-- Name: wishlists wishlists_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."wishlists"
    ADD CONSTRAINT "wishlists_pkey" PRIMARY KEY ("id");


--
-- Name: wishlists wishlists_user_id_product_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."wishlists"
    ADD CONSTRAINT "wishlists_user_id_product_id_unique" UNIQUE ("user_id", "product_id");


--
-- Name: addresses addresses_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."addresses"
    ADD CONSTRAINT "addresses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");


--
-- Name: order_items order_items_order_id_orders_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id");


--
-- Name: order_items order_items_product_id_products_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id");


--
-- Name: order_items order_items_variant_id_variants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_variant_id_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."variants"("id");


--
-- Name: orders orders_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");


--
-- Name: payments payments_order_id_orders_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id");


--
-- Name: payments payments_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");


--
-- Name: products products_category_id_categories_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id");


--
-- Name: referrals referrals_referee_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."referrals"
    ADD CONSTRAINT "referrals_referee_id_users_id_fk" FOREIGN KEY ("referee_id") REFERENCES "public"."users"("id");


--
-- Name: referrals referrals_referrer_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."referrals"
    ADD CONSTRAINT "referrals_referrer_id_users_id_fk" FOREIGN KEY ("referrer_id") REFERENCES "public"."users"("id");


--
-- Name: reviews reviews_product_id_products_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id");


--
-- Name: reviews reviews_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");


--
-- Name: variants variants_product_id_products_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."variants"
    ADD CONSTRAINT "variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id");


--
-- Name: wishlists wishlists_product_id_products_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."wishlists"
    ADD CONSTRAINT "wishlists_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;


--
-- Name: wishlists wishlists_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."wishlists"
    ADD CONSTRAINT "wishlists_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict kIZKFh9RNvbJya02mpdsMLoEFZXpqtT7QXLep36dcyUrsTCCUEFH8kxdmJMg8ab

