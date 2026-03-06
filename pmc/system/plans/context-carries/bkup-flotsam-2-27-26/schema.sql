

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


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA "extensions";






CREATE TYPE "public"."batch_item_status" AS ENUM (
    'pending',
    'processing',
    'completed',
    'failed',
    'skipped'
);


ALTER TYPE "public"."batch_item_status" OWNER TO "postgres";


CREATE TYPE "public"."batch_job_status" AS ENUM (
    'pending',
    'in_progress',
    'completed',
    'failed',
    'cancelled'
);


ALTER TYPE "public"."batch_job_status" OWNER TO "postgres";


CREATE TYPE "public"."conversation_status" AS ENUM (
    'draft',
    'generated',
    'pending_review',
    'approved',
    'rejected',
    'needs_revision',
    'none',
    'failed'
);


ALTER TYPE "public"."conversation_status" OWNER TO "postgres";


CREATE TYPE "public"."tier_type" AS ENUM (
    'template',
    'scenario',
    'edge_case'
);


ALTER TYPE "public"."tier_type" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auto_flag_low_quality"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF NEW.quality_score < 6.0 AND NEW.status = 'generated' THEN
        NEW.status := 'needs_revision';
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."auto_flag_low_quality"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_quality_score"("p_turn_count" integer, "p_total_tokens" integer, "p_quality_metrics" "jsonb") RETURNS numeric
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
DECLARE
    v_score DECIMAL(3,1) := 0;
    v_turn_score DECIMAL(3,1);
    v_length_score DECIMAL(3,1);
    v_metrics_score DECIMAL(3,1);
BEGIN
    -- Turn count scoring (optimal: 8-16 turns)
    IF p_turn_count BETWEEN 8 AND 16 THEN
        v_turn_score := 10.0;
    ELSIF p_turn_count BETWEEN 6 AND 20 THEN
        v_turn_score := 7.0;
    ELSE
        v_turn_score := 4.0;
    END IF;
    
    -- Token length scoring (optimal: 1000-3000 tokens)
    IF p_total_tokens BETWEEN 1000 AND 3000 THEN
        v_length_score := 10.0;
    ELSIF p_total_tokens BETWEEN 500 AND 5000 THEN
        v_length_score := 7.0;
    ELSE
        v_length_score := 4.0;
    END IF;
    
    -- Quality metrics average
    IF p_quality_metrics IS NOT NULL THEN
        v_metrics_score := (
            COALESCE((p_quality_metrics->>'overall')::DECIMAL, 5.0) +
            COALESCE((p_quality_metrics->>'relevance')::DECIMAL, 5.0) +
            COALESCE((p_quality_metrics->>'accuracy')::DECIMAL, 5.0)
        ) / 3.0;
    ELSE
        v_metrics_score := 5.0;
    END IF;
    
    -- Weighted average
    v_score := (v_turn_score * 0.3) + (v_length_score * 0.2) + (v_metrics_score * 0.5);
    
    RETURN ROUND(v_score, 1);
END;
$$;


ALTER FUNCTION "public"."calculate_quality_score"("p_turn_count" integer, "p_total_tokens" integer, "p_quality_metrics" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."capture_index_usage_snapshot"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    rows_inserted INTEGER;
BEGIN
    INSERT INTO index_usage_snapshots (
        schemaname,
        tablename,
        indexname,
        idx_scan,
        idx_tup_read,
        idx_tup_fetch,
        index_size_bytes,
        table_size_bytes
    )
    SELECT 
        schemaname,
        tablename,
        indexname,
        idx_scan,
        idx_tup_read,
        idx_tup_fetch,
        pg_relation_size(indexrelid) as index_size_bytes,
        pg_relation_size(relid) as table_size_bytes
    FROM pg_stat_user_indexes
    WHERE schemaname = 'public';
    
    GET DIAGNOSTICS rows_inserted = ROW_COUNT;
    RETURN rows_inserted;
END;
$$;


ALTER FUNCTION "public"."capture_index_usage_snapshot"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."capture_index_usage_snapshot"() IS 'Captures current index usage statistics for trend analysis';



CREATE OR REPLACE FUNCTION "public"."capture_table_bloat_snapshot"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    rows_inserted INTEGER;
BEGIN
    INSERT INTO table_bloat_snapshots (
        schemaname,
        tablename,
        actual_size_bytes,
        estimated_size_bytes,
        dead_tuples,
        live_tuples
    )
    SELECT 
        schemaname,
        tablename,
        pg_total_relation_size(schemaname || '.' || tablename)::BIGINT as actual_size_bytes,
        -- Rough estimate: avg_row_size * live_tuples + some overhead
        (COALESCE(n_live_tup, 0) * 100 + 8192)::BIGINT as estimated_size_bytes, -- Assume 100 bytes per row avg
        n_dead_tup as dead_tuples,
        n_live_tup as live_tuples
    FROM pg_stat_user_tables
    WHERE schemaname = 'public';
    
    GET DIAGNOSTICS rows_inserted = ROW_COUNT;
    RETURN rows_inserted;
END;
$$;


ALTER FUNCTION "public"."capture_table_bloat_snapshot"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."capture_table_bloat_snapshot"() IS 'Calculates and stores table bloat metrics';



CREATE OR REPLACE FUNCTION "public"."check_table_bloat_alerts"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    alert_count INTEGER := 0;
    bloat_record RECORD;
BEGIN
    FOR bloat_record IN 
        SELECT tablename, bloat_ratio, bloat_bytes
        FROM table_bloat_snapshots
        WHERE snapshot_timestamp > NOW() - INTERVAL '1 hour'
            AND bloat_ratio > 20
    LOOP
        PERFORM create_performance_alert(
            'high_bloat',
            CASE 
                WHEN bloat_record.bloat_ratio > 50 THEN 'critical'
                WHEN bloat_record.bloat_ratio > 35 THEN 'error'
                ELSE 'warning'
            END,
            'Table ' || bloat_record.tablename || ' has ' || bloat_record.bloat_ratio || '% bloat',
            jsonb_build_object(
                'table', bloat_record.tablename,
                'bloat_ratio', bloat_record.bloat_ratio,
                'bloat_bytes', bloat_record.bloat_bytes
            )
        );
        alert_count := alert_count + 1;
    END LOOP;
    
    RETURN alert_count;
END;
$$;


ALTER FUNCTION "public"."check_table_bloat_alerts"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."check_table_bloat_alerts"() IS 'Checks for high table bloat and creates alerts';



CREATE OR REPLACE FUNCTION "public"."cleanup_expired_backups"() RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM backup_exports
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;


ALTER FUNCTION "public"."cleanup_expired_backups"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_old_error_logs"() RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM error_logs
  WHERE created_at < NOW() - INTERVAL '90 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;


ALTER FUNCTION "public"."cleanup_old_error_logs"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_performance_alert"("p_alert_type" "text", "p_severity" "text", "p_message" "text", "p_details" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    alert_id UUID;
BEGIN
    INSERT INTO performance_alerts (alert_type, severity, message, details)
    VALUES (p_alert_type, p_severity, p_message, p_details)
    RETURNING id INTO alert_id;
    
    RETURN alert_id;
END;
$$;


ALTER FUNCTION "public"."create_performance_alert"("p_alert_type" "text", "p_severity" "text", "p_message" "text", "p_details" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_performance_alert"("p_alert_type" "text", "p_severity" "text", "p_message" "text", "p_details" "jsonb") IS 'Creates a new performance alert';



CREATE OR REPLACE FUNCTION "public"."detect_unused_indexes"("age_days" integer DEFAULT 30) RETURNS TABLE("schemaname" "text", "tablename" "text", "indexname" "text", "index_size" "text", "idx_scan" bigint, "days_since_last_scan" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.schemaname::TEXT,
        s.tablename::TEXT,
        s.indexname::TEXT,
        pg_size_pretty(pg_relation_size(s.indexrelid))::TEXT as index_size,
        s.idx_scan,
        age_days as days_since_last_scan
    FROM pg_stat_user_indexes s
    WHERE s.schemaname = 'public'
        AND s.idx_scan = 0
        AND pg_relation_size(s.indexrelid) > 100000 -- Only indexes > 100KB
        AND s.indexname NOT LIKE '%_pkey' -- Exclude primary keys
    ORDER BY pg_relation_size(s.indexrelid) DESC;
END;
$$;


ALTER FUNCTION "public"."detect_unused_indexes"("age_days" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."detect_unused_indexes"("age_days" integer) IS 'Identifies indexes with no usage that can potentially be dropped';



CREATE OR REPLACE FUNCTION "public"."exec_sql"("sql_script" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    EXECUTE sql_script;
END;
$$;


ALTER FUNCTION "public"."exec_sql"("sql_script" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."execute_analyze"("p_table_name" "text" DEFAULT NULL::"text", "p_verbose" boolean DEFAULT false) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_sql TEXT;
BEGIN
  v_sql := 'ANALYZE';
  
  IF p_verbose THEN
    v_sql := v_sql || ' VERBOSE';
  END IF;
  
  IF p_table_name IS NOT NULL THEN
    -- Validate table exists
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = p_table_name) THEN
      RAISE EXCEPTION 'Table % does not exist', p_table_name;
    END IF;
    v_sql := v_sql || ' ' || quote_ident(p_table_name);
  END IF;
  
  EXECUTE v_sql;
  
  RAISE NOTICE 'ANALYZE completed: %', v_sql;
END;
$$;


ALTER FUNCTION "public"."execute_analyze"("p_table_name" "text", "p_verbose" boolean) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."execute_analyze"("p_table_name" "text", "p_verbose" boolean) IS 'Executes ANALYZE operation with safety checks';



CREATE OR REPLACE FUNCTION "public"."execute_reindex"("p_table_name" "text" DEFAULT NULL::"text", "p_index_name" "text" DEFAULT NULL::"text", "p_concurrent" boolean DEFAULT false) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_sql TEXT;
BEGIN
  IF p_index_name IS NOT NULL THEN
    -- Reindex specific index
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = p_index_name) THEN
      RAISE EXCEPTION 'Index % does not exist', p_index_name;
    END IF;
    
    v_sql := 'REINDEX';
    IF p_concurrent THEN
      v_sql := v_sql || ' INDEX CONCURRENTLY';
    ELSE
      v_sql := v_sql || ' INDEX';
    END IF;
    v_sql := v_sql || ' ' || quote_ident(p_index_name);
  ELSIF p_table_name IS NOT NULL THEN
    -- Reindex entire table
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = p_table_name) THEN
      RAISE EXCEPTION 'Table % does not exist', p_table_name;
    END IF;
    
    v_sql := 'REINDEX';
    IF p_concurrent THEN
      v_sql := v_sql || ' TABLE CONCURRENTLY';
    ELSE
      v_sql := v_sql || ' TABLE';
    END IF;
    v_sql := v_sql || ' ' || quote_ident(p_table_name);
  ELSE
    RAISE EXCEPTION 'Either table_name or index_name must be provided';
  END IF;
  
  EXECUTE v_sql;
  
  RAISE NOTICE 'REINDEX completed: %', v_sql;
END;
$$;


ALTER FUNCTION "public"."execute_reindex"("p_table_name" "text", "p_index_name" "text", "p_concurrent" boolean) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."execute_reindex"("p_table_name" "text", "p_index_name" "text", "p_concurrent" boolean) IS 'Executes REINDEX operation with safety checks';



CREATE OR REPLACE FUNCTION "public"."execute_vacuum"("p_table_name" "text" DEFAULT NULL::"text", "p_full" boolean DEFAULT false, "p_analyze" boolean DEFAULT false, "p_verbose" boolean DEFAULT false) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_sql TEXT;
BEGIN
  -- Build VACUUM command
  v_sql := 'VACUUM';
  
  IF p_full THEN
    v_sql := v_sql || ' FULL';
  END IF;
  
  IF p_verbose THEN
    v_sql := v_sql || ' VERBOSE';
  END IF;
  
  IF p_analyze THEN
    v_sql := v_sql || ' ANALYZE';
  END IF;
  
  IF p_table_name IS NOT NULL THEN
    -- Validate table exists
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = p_table_name) THEN
      RAISE EXCEPTION 'Table % does not exist', p_table_name;
    END IF;
    v_sql := v_sql || ' ' || quote_ident(p_table_name);
  END IF;
  
  -- Execute VACUUM
  EXECUTE v_sql;
  
  RAISE NOTICE 'VACUUM completed: %', v_sql;
END;
$$;


ALTER FUNCTION "public"."execute_vacuum"("p_table_name" "text", "p_full" boolean, "p_analyze" boolean, "p_verbose" boolean) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."execute_vacuum"("p_table_name" "text", "p_full" boolean, "p_analyze" boolean, "p_verbose" boolean) IS 'Executes VACUUM operation with safety checks';



CREATE OR REPLACE FUNCTION "public"."get_connection_pool_metrics"() RETURNS TABLE("total" bigint, "active" bigint, "idle" bigint, "idle_in_transaction" bigint, "waiting" bigint, "max_connections" integer, "by_database" "jsonb", "by_user" "jsonb", "longest_query_seconds" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT AS total,
    COUNT(*) FILTER (WHERE state = 'active')::BIGINT AS active,
    COUNT(*) FILTER (WHERE state = 'idle')::BIGINT AS idle,
    COUNT(*) FILTER (WHERE state = 'idle in transaction')::BIGINT AS idle_in_transaction,
    COUNT(*) FILTER (WHERE wait_event_type IS NOT NULL)::BIGINT AS waiting,
    (SELECT setting::INTEGER FROM pg_settings WHERE name = 'max_connections') AS max_connections,
    (SELECT COALESCE(jsonb_object_agg(datname, count), '{}'::jsonb) FROM (
      SELECT datname, COUNT(*)::INTEGER as count 
      FROM pg_stat_activity 
      WHERE datname IS NOT NULL
      GROUP BY datname
    ) db_counts) AS by_database,
    (SELECT COALESCE(jsonb_object_agg(usename, count), '{}'::jsonb) FROM (
      SELECT usename, COUNT(*)::INTEGER as count 
      FROM pg_stat_activity 
      WHERE usename IS NOT NULL
      GROUP BY usename
    ) user_counts) AS by_user,
    COALESCE(MAX(EXTRACT(EPOCH FROM (NOW() - query_start))), 0)::NUMERIC AS longest_query_seconds
  FROM pg_stat_activity
  WHERE pid <> pg_backend_pid();
END;
$$;


ALTER FUNCTION "public"."get_connection_pool_metrics"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_connection_pool_metrics"() IS 'Returns connection pool status and utilization metrics';



CREATE OR REPLACE FUNCTION "public"."get_conversations_by_chunk"("chunk_uuid" "uuid") RETURNS TABLE("id" "uuid", "conversation_id" "text", "title" "text", "status" "text", "quality_score" numeric, "created_at" timestamp with time zone)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.conversation_id,
    c.title,
    c.status::TEXT,
    c.quality_score,
    c.created_at
  FROM conversations c
  WHERE c.parent_chunk_id = chunk_uuid
  ORDER BY c.created_at DESC;
END;
$$;


ALTER FUNCTION "public"."get_conversations_by_chunk"("chunk_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_conversations_by_chunk"("target_chunk_id" "uuid", "include_metadata" boolean DEFAULT false) RETURNS TABLE("conversation_id" "uuid", "title" "text", "status" "text", "chunk_context" "text", "dimension_data" "jsonb", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.persona,  -- Using persona as title since conversations may not have title column
    c.status::TEXT,
    CASE WHEN include_metadata THEN c.chunk_context ELSE NULL END,
    CASE WHEN include_metadata THEN c.dimension_source ELSE NULL END,
    c.created_at
  FROM conversations c
  WHERE c.parent_chunk_id = target_chunk_id
  ORDER BY c.created_at DESC;
END;
$$;


ALTER FUNCTION "public"."get_conversations_by_chunk"("target_chunk_id" "uuid", "include_metadata" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_database_overview"() RETURNS TABLE("datname" "name", "database_size" bigint, "numbackends" integer, "xact_commit" bigint, "xact_rollback" bigint, "blks_read" bigint, "blks_hit" bigint, "tup_returned" bigint, "tup_fetched" bigint, "tup_inserted" bigint, "tup_updated" bigint, "tup_deleted" bigint, "conflicts" bigint, "temp_files" bigint, "temp_bytes" bigint, "deadlocks" bigint, "checksum_failures" bigint, "stats_reset" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.datname,
    pg_database_size(d.datname) AS database_size,
    d.numbackends,
    d.xact_commit,
    d.xact_rollback,
    d.blks_read,
    d.blks_hit,
    d.tup_returned,
    d.tup_fetched,
    d.tup_inserted,
    d.tup_updated,
    d.tup_deleted,
    d.conflicts,
    d.temp_files,
    d.temp_bytes,
    d.deadlocks,
    COALESCE(d.checksum_failures, 0) AS checksum_failures,
    d.stats_reset
  FROM pg_stat_database d
  WHERE d.datname = current_database();
END;
$$;


ALTER FUNCTION "public"."get_database_overview"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_database_overview"() IS 'Returns comprehensive database-wide metrics from pg_stat_database';



CREATE OR REPLACE FUNCTION "public"."get_export_logs_schema"() RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'columns', (
      SELECT json_agg(json_build_object(
        'column_name', column_name,
        'data_type', data_type,
        'is_nullable', is_nullable,
        'column_default', column_default,
        'ordinal_position', ordinal_position
      ) ORDER BY ordinal_position)
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'export_logs'
    ),
    'indexes', (
      SELECT json_agg(json_build_object(
        'indexname', indexname,
        'indexdef', indexdef
      ) ORDER BY indexname)
      FROM pg_indexes
      WHERE schemaname = 'public' AND tablename = 'export_logs'
    ),
    'constraints', (
      SELECT json_agg(json_build_object(
        'constraint_name', conname,
        'constraint_type', CASE contype
          WHEN 'c' THEN 'CHECK'
          WHEN 'f' THEN 'FOREIGN KEY'
          WHEN 'p' THEN 'PRIMARY KEY'
          WHEN 'u' THEN 'UNIQUE'
          WHEN 't' THEN 'TRIGGER'
          WHEN 'x' THEN 'EXCLUSION'
          ELSE contype::text
        END,
        'definition', pg_get_constraintdef(oid)
      ) ORDER BY contype, conname)
      FROM pg_constraint
      WHERE conrelid = 'export_logs'::regclass
    ),
    'rls_policies', (
      SELECT json_agg(json_build_object(
        'policyname', policyname,
        'cmd', cmd,
        'qual', qual,
        'with_check', with_check
      ) ORDER BY policyname)
      FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'export_logs'
    ),
    'rls_enabled', (
      SELECT rowsecurity
      FROM pg_tables
      WHERE schemaname = 'public' AND tablename = 'export_logs'
    ),
    'table_exists', (
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'export_logs'
      )
    ),
    'row_count', (
      SELECT COUNT(*)::int
      FROM export_logs
    )
  ) INTO result;
  
  RETURN result;
END;
$$;


ALTER FUNCTION "public"."get_export_logs_schema"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_index_health_metrics"() RETURNS TABLE("schemaname" "name", "relname" "name", "indexrelname" "name", "index_size" bigint, "idx_scan" bigint, "idx_tup_read" bigint, "idx_tup_fetch" bigint, "days_since_last_use" numeric, "bloat_pct" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.schemaname,
    s.relname,
    s.indexrelname,
    pg_relation_size(s.indexrelid) AS index_size,
    s.idx_scan,
    s.idx_tup_read,
    s.idx_tup_fetch,
    -- Approximate days since last use (0 if recently used)
    CASE 
      WHEN s.idx_scan > 0 THEN 0::NUMERIC
      ELSE 30::NUMERIC  -- Simplified: assume 30 days if never scanned
    END AS days_since_last_use,
    0::NUMERIC AS bloat_pct  -- Simplified bloat calculation
  FROM pg_stat_user_indexes s
  ORDER BY pg_relation_size(s.indexrelid) DESC;
END;
$$;


ALTER FUNCTION "public"."get_index_health_metrics"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_index_health_metrics"() IS 'Returns index-level health metrics including usage statistics';



CREATE OR REPLACE FUNCTION "public"."get_scenario_edge_case_count"("scenario_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql" STABLE
    AS $$
BEGIN
    RETURN (SELECT COUNT(*) FROM public.edge_cases WHERE parent_scenario_id = scenario_id);
END;
$$;


ALTER FUNCTION "public"."get_scenario_edge_case_count"("scenario_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_slow_queries"("hours_back" integer DEFAULT 24, "min_duration_ms" integer DEFAULT 500) RETURNS TABLE("queryid" bigint, "query" "text", "calls" bigint, "total_exec_time" numeric, "mean_exec_time" numeric, "min_exec_time" numeric, "max_exec_time" numeric, "stddev_exec_time" numeric, "rows" bigint, "shared_blks_hit" bigint, "shared_blks_read" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Check if pg_stat_statements exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements'
  ) THEN
    RAISE NOTICE 'pg_stat_statements extension is not enabled. Returning empty result.';
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    s.queryid,
    s.query,
    s.calls,
    s.total_exec_time,
    s.mean_exec_time,
    s.min_exec_time,
    s.max_exec_time,
    s.stddev_exec_time,
    s.rows,
    s.shared_blks_hit,
    s.shared_blks_read
  FROM pg_stat_statements s
  WHERE s.mean_exec_time > min_duration_ms
  ORDER BY s.mean_exec_time DESC
  LIMIT 100;
END;
$$;


ALTER FUNCTION "public"."get_slow_queries"("hours_back" integer, "min_duration_ms" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_slow_queries"("hours_back" integer, "min_duration_ms" integer) IS 'Returns slow queries from pg_stat_statements (requires extension)';



CREATE OR REPLACE FUNCTION "public"."get_table_health_metrics"() RETURNS TABLE("schemaname" "name", "relname" "name", "n_live_tup" bigint, "n_dead_tup" bigint, "table_size" bigint, "last_vacuum" timestamp with time zone, "last_autovacuum" timestamp with time zone, "last_analyze" timestamp with time zone, "last_autoanalyze" timestamp with time zone, "vacuum_count" bigint, "autovacuum_count" bigint, "analyze_count" bigint, "autoanalyze_count" bigint, "bloat_pct" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.schemaname,
    s.relname,
    s.n_live_tup,
    s.n_dead_tup,
    pg_total_relation_size(s.relid) AS table_size,
    s.last_vacuum,
    s.last_autovacuum,
    s.last_analyze,
    s.last_autoanalyze,
    s.vacuum_count,
    s.autovacuum_count,
    s.analyze_count,
    s.autoanalyze_count,
    -- Simple bloat estimation based on dead tuple ratio
    CASE 
      WHEN s.n_live_tup > 0 
      THEN ROUND((s.n_dead_tup::NUMERIC / s.n_live_tup::NUMERIC) * 100, 2)
      ELSE 0
    END AS bloat_pct
  FROM pg_stat_user_tables s
  ORDER BY pg_total_relation_size(s.relid) DESC;
END;
$$;


ALTER FUNCTION "public"."get_table_health_metrics"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_table_health_metrics"() IS 'Returns table-level health metrics including bloat and maintenance status';



CREATE OR REPLACE FUNCTION "public"."get_template_scenario_count"("template_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql" STABLE
    AS $$
BEGIN
    RETURN (SELECT COUNT(*) FROM public.scenarios WHERE parent_template_id = template_id);
END;
$$;


ALTER FUNCTION "public"."get_template_scenario_count"("template_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, email_confirmed, auth_provider, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email_confirmed_at IS NOT NULL,
    COALESCE(NEW.raw_app_meta_data->>'provider', 'email'),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    email_confirmed = EXCLUDED.email_confirmed,
    auth_provider = EXCLUDED.auth_provider,
    updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_arc_usage"("arc_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE emotional_arcs
  SET usage_count = COALESCE(usage_count, 0) + 1,
      last_used_at = NOW()
  WHERE id = arc_id;
END;
$$;


ALTER FUNCTION "public"."increment_arc_usage"("arc_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_custom_tag_usage"("tag_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    UPDATE custom_tags
    SET usage_count = usage_count + 1,
        updated_at = NOW()
    WHERE id = tag_id;
END;
$$;


ALTER FUNCTION "public"."increment_custom_tag_usage"("tag_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_kb_doc_count"("kb_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$ BEGIN UPDATE rag_knowledge_bases SET document_count = document_count + 1, updated_at = now() WHERE id = kb_id; END; $$;


ALTER FUNCTION "public"."increment_kb_doc_count"("kb_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_persona_usage"("persona_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE personas
  SET usage_count = COALESCE(usage_count, 0) + 1,
      last_used_at = NOW()
  WHERE id = persona_id;
END;
$$;


ALTER FUNCTION "public"."increment_persona_usage"("persona_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_topic_usage"("topic_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE training_topics
  SET usage_count = COALESCE(usage_count, 0) + 1,
      last_used_at = NOW()
  WHERE id = topic_id;
END;
$$;


ALTER FUNCTION "public"."increment_topic_usage"("topic_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."index_exists"("p_index_name" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND indexname = p_index_name
  );
END;
$$;


ALTER FUNCTION "public"."index_exists"("p_index_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."match_rag_embeddings"("query_embedding" "extensions"."vector", "match_threshold" double precision, "match_count" integer, "filter_document_id" "uuid" DEFAULT NULL::"uuid", "filter_tier" integer DEFAULT NULL::integer) RETURNS TABLE("id" "uuid", "source_type" "text", "source_id" "uuid", "content_text" "text", "tier" integer, "similarity" double precision)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    re.id,
    re.source_type,
    re.source_id,
    re.content_text,
    re.tier,
    1 - (re.embedding <=> query_embedding) AS similarity
  FROM rag_embeddings re
  WHERE
    (filter_document_id IS NULL OR re.document_id = filter_document_id)
    AND (filter_tier IS NULL OR re.tier = filter_tier)
    AND 1 - (re.embedding <=> query_embedding) > match_threshold
  ORDER BY re.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;


ALTER FUNCTION "public"."match_rag_embeddings"("query_embedding" "extensions"."vector", "match_threshold" double precision, "match_count" integer, "filter_document_id" "uuid", "filter_tier" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."match_rag_embeddings"("query_embedding" "extensions"."vector", "match_threshold" double precision, "match_count" integer, "filter_document_id" "uuid", "filter_tier" integer) IS 'Vector similarity search using pgvector cosine distance for RAG embeddings';



CREATE OR REPLACE FUNCTION "public"."match_rag_embeddings_kb"("query_embedding" "extensions"."vector", "match_threshold" double precision, "match_count" integer, "filter_knowledge_base_id" "uuid" DEFAULT NULL::"uuid", "filter_document_id" "uuid" DEFAULT NULL::"uuid", "filter_tier" integer DEFAULT NULL::integer) RETURNS TABLE("id" "uuid", "document_id" "uuid", "source_type" "text", "source_id" "uuid", "content_text" "text", "similarity" double precision, "tier" integer, "metadata" "jsonb")
    LANGUAGE "plpgsql"
    AS $$
  BEGIN
    RETURN QUERY
    SELECT
      e.id,
      e.document_id,
      e.source_type,
      e.source_id,
      e.content_text,
      1 - (e.embedding <=> query_embedding) AS similarity,
      e.tier,
      e.metadata
    FROM rag_embeddings e
    WHERE 1 - (e.embedding <=> query_embedding) > match_threshold
      AND (filter_knowledge_base_id IS NULL OR e.knowledge_base_id = filter_knowledge_base_id)
      AND (filter_document_id IS NULL OR e.document_id = filter_document_id)
      AND (filter_tier IS NULL OR e.tier = filter_tier)
    ORDER BY e.embedding <=> query_embedding
    LIMIT match_count;
  END;
  $$;


ALTER FUNCTION "public"."match_rag_embeddings_kb"("query_embedding" "extensions"."vector", "match_threshold" double precision, "match_count" integer, "filter_knowledge_base_id" "uuid", "filter_document_id" "uuid", "filter_tier" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."match_rag_embeddings_kb"("query_embedding" "extensions"."vector", "match_threshold" double precision, "match_count" integer, "filter_knowledge_base_id" "uuid" DEFAULT NULL::"uuid", "filter_document_id" "uuid" DEFAULT NULL::"uuid", "filter_tier" integer DEFAULT NULL::integer, "filter_run_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("id" "uuid", "document_id" "uuid", "source_type" "text", "source_id" "uuid", "content_text" "text", "similarity" double precision, "tier" integer, "metadata" "jsonb")
    LANGUAGE "plpgsql"
    AS $$
  BEGIN
    RETURN QUERY
    SELECT
      e.id,
      e.document_id,
      e.source_type,
      e.source_id,
      e.content_text,
      1 - (e.embedding <=> query_embedding) AS similarity,
      e.tier,
      e.metadata
    FROM rag_embeddings e
    WHERE 1 - (e.embedding <=> query_embedding) > match_threshold
      AND (filter_knowledge_base_id IS NULL OR e.knowledge_base_id = filter_knowledge_base_id)
      AND (filter_document_id IS NULL OR e.document_id = filter_document_id)
      AND (filter_tier IS NULL OR e.tier = filter_tier)
      AND (filter_run_id IS NULL OR e.run_id = filter_run_id)
    ORDER BY e.embedding <=> query_embedding
    LIMIT match_count;
  END;
  $$;


ALTER FUNCTION "public"."match_rag_embeddings_kb"("query_embedding" "extensions"."vector", "match_threshold" double precision, "match_count" integer, "filter_knowledge_base_id" "uuid", "filter_document_id" "uuid", "filter_tier" integer, "filter_run_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."migrate_workflow_session_to_normalized"("session_id" "uuid") RETURNS TABLE("categories_migrated" integer, "tags_migrated" integer, "custom_tags_migrated" integer)
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_document_id UUID;
    v_category_id UUID;
    v_belonging_rating INTEGER;
    v_user_id UUID;
    v_selected_tags JSONB;
    v_custom_tags JSONB;
    v_dimension_key TEXT;
    v_tag_ids TEXT[];
    v_tag_id TEXT;
    v_categories_count INTEGER := 0;
    v_tags_count INTEGER := 0;
    v_custom_tags_count INTEGER := 0;
BEGIN
    -- Get session data
    SELECT 
        document_id, 
        selected_category_id, 
        belonging_rating, 
        user_id,
        selected_tags,
        custom_tags
    INTO 
        v_document_id, 
        v_category_id, 
        v_belonging_rating, 
        v_user_id,
        v_selected_tags,
        v_custom_tags
    FROM workflow_sessions
    WHERE id = session_id;

    -- Skip if no data
    IF v_document_id IS NULL THEN
        RETURN;
    END IF;

    -- Migrate category (if not already migrated)
    IF v_category_id IS NOT NULL THEN
        INSERT INTO document_categories (
            document_id,
            category_id,
            workflow_session_id,
            belonging_rating,
            assigned_by,
            assigned_at,
            is_primary
        ) VALUES (
            v_document_id,
            v_category_id,
            session_id,
            v_belonging_rating,
            v_user_id,
            NOW(),
            true
        )
        ON CONFLICT (document_id, is_primary) DO NOTHING;
        
        v_categories_count := 1;
    END IF;

    -- Migrate tags from JSONB
    IF v_selected_tags IS NOT NULL THEN
        FOR v_dimension_key, v_tag_ids IN 
            SELECT key, array_agg(value::text) 
            FROM jsonb_each(v_selected_tags), jsonb_array_elements_text(value)
            GROUP BY key
        LOOP
            FOREACH v_tag_id IN ARRAY v_tag_ids
            LOOP
                -- Get dimension_id from tag
                DECLARE
                    v_dimension_id UUID;
                BEGIN
                    SELECT dimension_id INTO v_dimension_id
                    FROM tags
                    WHERE id = v_tag_id::UUID;

                    IF v_dimension_id IS NOT NULL THEN
                        INSERT INTO document_tags (
                            document_id,
                            tag_id,
                            dimension_id,
                            workflow_session_id,
                            assigned_by,
                            assigned_at,
                            is_custom_tag
                        ) VALUES (
                            v_document_id,
                            v_tag_id::UUID,
                            v_dimension_id,
                            session_id,
                            v_user_id,
                            NOW(),
                            false
                        )
                        ON CONFLICT (document_id, tag_id) DO NOTHING;
                        
                        v_tags_count := v_tags_count + 1;
                    END IF;
                END;
            END LOOP;
        END LOOP;
    END IF;

    -- Return counts
    RETURN QUERY SELECT v_categories_count, v_tags_count, v_custom_tags_count;
END;
$$;


ALTER FUNCTION "public"."migrate_workflow_session_to_normalized"("session_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reindex_if_bloated"("table_name" "text", "bloat_threshold" numeric DEFAULT 20.0) RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    current_bloat NUMERIC;
    result_text TEXT;
BEGIN
    -- Get current bloat ratio
    SELECT bloat_ratio INTO current_bloat
    FROM table_bloat_snapshots
    WHERE tablename = table_name
    ORDER BY snapshot_timestamp DESC
    LIMIT 1;
    
    IF current_bloat IS NULL THEN
        RETURN 'No bloat data available for ' || table_name;
    END IF;
    
    IF current_bloat > bloat_threshold THEN
        EXECUTE format('REINDEX TABLE %I', table_name);
        result_text := 'REINDEX completed for ' || table_name || ' (bloat was ' || current_bloat || '%)';
        
        -- Create alert
        PERFORM create_performance_alert(
            'high_bloat',
            'info',
            'Table reindexed: ' || table_name,
            jsonb_build_object('previous_bloat', current_bloat, 'threshold', bloat_threshold)
        );
    ELSE
        result_text := 'Bloat (' || current_bloat || '%) below threshold (' || bloat_threshold || '%) for ' || table_name;
    END IF;
    
    RETURN result_text;
END;
$$;


ALTER FUNCTION "public"."reindex_if_bloated"("table_name" "text", "bloat_threshold" numeric) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."reindex_if_bloated"("table_name" "text", "bloat_threshold" numeric) IS 'Reindexes table if bloat exceeds threshold';



CREATE OR REPLACE FUNCTION "public"."safe_delete_scenario"("scenario_id" "uuid") RETURNS TABLE("success" boolean, "message" "text")
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    edge_case_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO edge_case_count
    FROM public.edge_cases
    WHERE parent_scenario_id = scenario_id;
    
    IF edge_case_count > 0 THEN
        RETURN QUERY SELECT false, format('Cannot delete scenario: %s dependent edge cases exist', edge_case_count);
    ELSE
        DELETE FROM public.scenarios WHERE id = scenario_id;
        RETURN QUERY SELECT true, 'Scenario deleted successfully';
    END IF;
END;
$$;


ALTER FUNCTION "public"."safe_delete_scenario"("scenario_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."safe_delete_template"("template_id" "uuid") RETURNS TABLE("success" boolean, "message" "text")
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    scenario_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO scenario_count
    FROM public.scenarios
    WHERE parent_template_id = template_id;
    
    IF scenario_count > 0 THEN
        RETURN QUERY SELECT false, format('Cannot delete template: %s dependent scenarios exist', scenario_count);
    ELSE
        DELETE FROM public.templates WHERE id = template_id;
        RETURN QUERY SELECT true, 'Template deleted successfully';
    END IF;
END;
$$;


ALTER FUNCTION "public"."safe_delete_template"("template_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_rag_text"("search_query" "text", "filter_knowledge_base_id" "uuid" DEFAULT NULL::"uuid", "filter_document_id" "uuid" DEFAULT NULL::"uuid", "match_count" integer DEFAULT 10) RETURNS TABLE("source_type" "text", "source_id" "uuid", "document_id" "uuid", "content" "text", "rank" double precision)
    LANGUAGE "plpgsql"
    AS $$
  BEGIN
    RETURN QUERY
    (
      SELECT 'fact'::text, f.id, f.document_id, f.content,
             ts_rank(f.content_tsv, plainto_tsquery('english', search_query))::float
      FROM rag_facts f
      WHERE f.content_tsv @@ plainto_tsquery('english', search_query)
        AND (filter_document_id IS NULL OR f.document_id = filter_document_id)
        AND (filter_knowledge_base_id IS NULL OR f.document_id IN (
          SELECT d.id FROM rag_documents d WHERE d.knowledge_base_id = filter_knowledge_base_id
        ))
    )
    UNION ALL
    (
      SELECT 'section'::text, s.id, s.document_id, s.title || ': ' || left(s.original_text, 500),
             ts_rank(s.text_tsv, plainto_tsquery('english', search_query))::float
      FROM rag_sections s
      WHERE s.text_tsv @@ plainto_tsquery('english', search_query)
        AND (filter_document_id IS NULL OR s.document_id = filter_document_id)
        AND (filter_knowledge_base_id IS NULL OR s.document_id IN (
          SELECT d.id FROM rag_documents d WHERE d.knowledge_base_id = filter_knowledge_base_id
        ))
    )
    ORDER BY 5 DESC
    LIMIT match_count;
  END;
  $$;


ALTER FUNCTION "public"."search_rag_text"("search_query" "text", "filter_knowledge_base_id" "uuid", "filter_document_id" "uuid", "match_count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_rag_text"("search_query" "text", "filter_knowledge_base_id" "uuid" DEFAULT NULL::"uuid", "filter_document_id" "uuid" DEFAULT NULL::"uuid", "filter_run_id" "uuid" DEFAULT NULL::"uuid", "match_count" integer DEFAULT 10) RETURNS TABLE("source_type" "text", "source_id" "uuid", "document_id" "uuid", "content" "text", "rank" double precision)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  (
    SELECT 'fact'::text, f.id, f.document_id, f.content,
           ts_rank(f.content_tsv, plainto_tsquery('english', search_query))::float
    FROM rag_facts f
    WHERE f.content_tsv @@ plainto_tsquery('english', search_query)
      AND (filter_document_id IS NULL OR f.document_id = filter_document_id)
      AND (filter_knowledge_base_id IS NULL OR f.document_id IN (
        SELECT d.id FROM rag_documents d WHERE d.knowledge_base_id = filter_knowledge_base_id
      ))
      AND (filter_run_id IS NULL OR EXISTS (
        SELECT 1 FROM rag_embeddings e
        WHERE e.source_id = f.id
          AND e.source_type = 'fact'
          AND e.run_id = filter_run_id
      ))
  )
  UNION ALL
  (
    SELECT 'section'::text, s.id, s.document_id, s.title || ': ' || left(s.original_text, 500),
           ts_rank(s.text_tsv, plainto_tsquery('english', search_query))::float
    FROM rag_sections s
    WHERE s.text_tsv @@ plainto_tsquery('english', search_query)
      AND (filter_document_id IS NULL OR s.document_id = filter_document_id)
      AND (filter_knowledge_base_id IS NULL OR s.document_id IN (
        SELECT d.id FROM rag_documents d WHERE d.knowledge_base_id = filter_knowledge_base_id
      ))
      AND (filter_run_id IS NULL OR EXISTS (
        SELECT 1 FROM rag_embeddings e
        WHERE e.source_id = s.id
          AND e.source_type = 'section'
          AND e.run_id = filter_run_id
      ))
  )
  ORDER BY 5 DESC
  LIMIT match_count;
END;
$$;


ALTER FUNCTION "public"."search_rag_text"("search_query" "text", "filter_knowledge_base_id" "uuid", "filter_document_id" "uuid", "filter_run_id" "uuid", "match_count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."table_exists"("p_table_name" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = p_table_name
  );
END;
$$;


ALTER FUNCTION "public"."table_exists"("p_table_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_rag_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_rag_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_templates_last_modified"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.last_modified = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_templates_last_modified"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_train_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_train_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."vacuum_analyze_table"("table_name" "text") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    EXECUTE format('VACUUM ANALYZE %I', table_name);
    RETURN 'VACUUM ANALYZE completed for ' || table_name;
EXCEPTION
    WHEN OTHERS THEN
        RETURN 'Error during VACUUM ANALYZE: ' || SQLERRM;
END;
$$;


ALTER FUNCTION "public"."vacuum_analyze_table"("table_name" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."vacuum_analyze_table"("table_name" "text") IS 'Performs VACUUM ANALYZE on specified table';



CREATE OR REPLACE FUNCTION "public"."validate_document_categorization"("doc_id" "uuid") RETURNS TABLE("is_valid" boolean, "has_primary_category" boolean, "required_dimensions_filled" boolean, "validation_message" "text")
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_has_category BOOLEAN;
    v_required_dims_count INTEGER;
    v_filled_dims_count INTEGER;
    v_message TEXT := '';
BEGIN
    -- Check primary category
    SELECT EXISTS(
        SELECT 1 FROM document_categories
        WHERE document_id = doc_id AND is_primary = true
    ) INTO v_has_category;

    -- Check required dimensions (authorship, disclosure-risk, intended-use)
    SELECT COUNT(DISTINCT td.id) INTO v_required_dims_count
    FROM tag_dimensions td
    WHERE td.required = true;

    SELECT COUNT(DISTINCT dt.dimension_id) INTO v_filled_dims_count
    FROM document_tags dt
    JOIN tag_dimensions td ON td.id = dt.dimension_id
    WHERE dt.document_id = doc_id AND td.required = true;

    -- Build validation message
    IF NOT v_has_category THEN
        v_message := 'Missing primary category. ';
    END IF;

    IF v_filled_dims_count < v_required_dims_count THEN
        v_message := v_message || 'Missing required tag dimensions. ';
    END IF;

    IF v_message = '' THEN
        v_message := 'Validation passed';
    END IF;

    -- Return validation results
    RETURN QUERY SELECT 
        (v_has_category AND v_filled_dims_count >= v_required_dims_count),
        v_has_category,
        (v_filled_dims_count >= v_required_dims_count),
        v_message;
END;
$$;


ALTER FUNCTION "public"."validate_document_categorization"("doc_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."weekly_maintenance"() RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    result_text TEXT := '';
    table_record RECORD;
BEGIN
    -- Capture snapshots first
    PERFORM capture_index_usage_snapshot();
    PERFORM capture_table_bloat_snapshot();
    
    -- Vacuum analyze all train module tables
    FOR table_record IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
            AND tablename IN (
                'conversations', 
                'conversation_turns', 
                'conversation_templates',
                'scenarios',
                'edge_cases',
                'generation_logs',
                'export_logs',
                'batch_jobs',
                'query_performance_logs',
                'index_usage_snapshots',
                'table_bloat_snapshots'
            )
    LOOP
        result_text := result_text || vacuum_analyze_table(table_record.tablename) || '; ';
    END LOOP;
    
    -- Check for alerts
    PERFORM check_table_bloat_alerts();
    
    result_text := result_text || 'Weekly maintenance completed.';
    RETURN result_text;
END;
$$;


ALTER FUNCTION "public"."weekly_maintenance"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."weekly_maintenance"() IS 'Performs comprehensive weekly maintenance on all tables';


SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."_orphaned_records" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "source_table" "text" NOT NULL,
    "source_id" "uuid" NOT NULL,
    "discovered_at" timestamp with time zone DEFAULT "now"(),
    "resolution" "text" DEFAULT 'pending'::"text",
    "assigned_to" "uuid",
    "notes" "text"
);


ALTER TABLE "public"."_orphaned_records" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."api_response_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "timestamp" timestamp with time zone DEFAULT "now"() NOT NULL,
    "chunk_id" "uuid" NOT NULL,
    "run_id" "uuid",
    "template_type" "text" NOT NULL,
    "template_name" "text" NOT NULL,
    "model" "text" NOT NULL,
    "temperature" numeric NOT NULL,
    "max_tokens" integer NOT NULL,
    "prompt" "text" NOT NULL,
    "chunk_text_preview" "text",
    "document_category" "text",
    "claude_response" "jsonb" NOT NULL,
    "parsed_successfully" boolean NOT NULL,
    "extraction_error" "text",
    "dimensions_extracted" "jsonb",
    "input_tokens" integer NOT NULL,
    "output_tokens" integer NOT NULL,
    "estimated_cost_usd" numeric NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."api_response_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."backup_exports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "backup_id" character varying(100) NOT NULL,
    "user_id" "uuid",
    "file_path" "text",
    "conversation_ids" "jsonb" NOT NULL,
    "backup_reason" character varying(100),
    "expires_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."backup_exports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."batch_checkpoints" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "job_id" "uuid" NOT NULL,
    "completed_items" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "failed_items" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "progress_percentage" integer DEFAULT 0,
    "last_checkpoint_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."batch_checkpoints" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."batch_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "batch_job_id" "uuid" NOT NULL,
    "position" integer NOT NULL,
    "topic" "text" NOT NULL,
    "tier" "text" NOT NULL,
    "parameters" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "status" "text" DEFAULT 'queued'::"text" NOT NULL,
    "progress" integer DEFAULT 0,
    "estimated_time" integer,
    "conversation_id" "uuid",
    "error" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "error_message" "text",
    CONSTRAINT "batch_items_progress_check" CHECK ((("progress" >= 0) AND ("progress" <= 100))),
    CONSTRAINT "batch_items_status_check" CHECK (("status" = ANY (ARRAY['queued'::"text", 'processing'::"text", 'completed'::"text", 'failed'::"text"]))),
    CONSTRAINT "batch_items_tier_check" CHECK (("tier" = ANY (ARRAY['template'::"text", 'scenario'::"text", 'edge_case'::"text"])))
);


ALTER TABLE "public"."batch_items" OWNER TO "postgres";


COMMENT ON COLUMN "public"."batch_items"."error_message" IS 'Error message if processing failed';



CREATE TABLE IF NOT EXISTS "public"."batch_jobs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "job_type" "text" NOT NULL,
    "name" "text",
    "description" "text",
    "configuration" "jsonb" DEFAULT '{}'::"jsonb",
    "target_tier" "text",
    "status" character varying(20) NOT NULL,
    "total_items" integer DEFAULT 0 NOT NULL,
    "completed_items" integer DEFAULT 0,
    "failed_items" integer DEFAULT 0,
    "skipped_items" integer DEFAULT 0,
    "progress_percentage" numeric(5,2) DEFAULT 0,
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "estimated_completion_at" timestamp with time zone,
    "duration_seconds" integer,
    "priority" character varying(20) DEFAULT 'normal'::character varying,
    "error_message" "text",
    "retry_count" integer DEFAULT 0,
    "max_retries" integer DEFAULT 3,
    "results" "jsonb" DEFAULT '{}'::"jsonb",
    "summary" "text",
    "concurrent_processing" integer DEFAULT 3,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "error_handling" character varying(20) DEFAULT 'continue'::character varying,
    "shared_parameters" "jsonb" DEFAULT '{}'::"jsonb",
    "tier" character varying(50) DEFAULT 'template'::character varying,
    "successful_items" integer DEFAULT 0,
    "estimated_time_remaining" integer,
    "user_id" "uuid",
    "updated_by" "uuid",
    CONSTRAINT "batch_jobs_job_type_check" CHECK (("job_type" = ANY (ARRAY['generation'::"text", 'export'::"text", 'validation'::"text", 'cleanup'::"text"]))),
    CONSTRAINT "batch_jobs_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['queued'::character varying, 'processing'::character varying, 'paused'::character varying, 'completed'::character varying, 'failed'::character varying, 'cancelled'::character varying])::"text"[]))),
    CONSTRAINT "batch_jobs_target_tier_check" CHECK (("target_tier" = ANY (ARRAY['template'::"text", 'scenario'::"text", 'edge_case'::"text", 'all'::"text"]))),
    CONSTRAINT "check_error_handling" CHECK ((("error_handling")::"text" = ANY (ARRAY[('stop'::character varying)::"text", ('continue'::character varying)::"text"])))
);


ALTER TABLE "public"."batch_jobs" OWNER TO "postgres";


COMMENT ON TABLE "public"."batch_jobs" IS 'Async job processing for generation, export, and cleanup';



COMMENT ON COLUMN "public"."batch_jobs"."status" IS 'Job status: queued (waiting), processing (active), paused, completed, failed, cancelled';



COMMENT ON COLUMN "public"."batch_jobs"."total_items" IS 'Total number of items in the batch';



COMMENT ON COLUMN "public"."batch_jobs"."completed_items" IS 'Number of items processed (success + fail)';



COMMENT ON COLUMN "public"."batch_jobs"."failed_items" IS 'Number of items that failed processing';



COMMENT ON COLUMN "public"."batch_jobs"."priority" IS 'Priority: low, normal, high';



COMMENT ON COLUMN "public"."batch_jobs"."concurrent_processing" IS 'Number of items to process concurrently';



COMMENT ON COLUMN "public"."batch_jobs"."error_handling" IS 'Error handling strategy: stop (halt on first error) or continue (process all items). Default: continue';



COMMENT ON COLUMN "public"."batch_jobs"."shared_parameters" IS 'Shared parameters applied to all items in the batch';



COMMENT ON COLUMN "public"."batch_jobs"."tier" IS 'Tier of the batch (template, edge_case, etc.)';



COMMENT ON COLUMN "public"."batch_jobs"."successful_items" IS 'Number of items successfully processed';



COMMENT ON COLUMN "public"."batch_jobs"."estimated_time_remaining" IS 'Estimated seconds remaining for batch completion';



CREATE TABLE IF NOT EXISTS "public"."conversation_turns" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "conversation_id" "uuid" NOT NULL,
    "turn_number" integer NOT NULL,
    "user_message" "text" NOT NULL,
    "control_response" "text",
    "control_generation_time_ms" integer,
    "control_tokens_used" integer,
    "control_error" "text",
    "adapted_response" "text",
    "adapted_generation_time_ms" integer,
    "adapted_tokens_used" integer,
    "adapted_error" "text",
    "evaluation_enabled" boolean DEFAULT false NOT NULL,
    "evaluation_prompt_id" "uuid",
    "control_evaluation" "jsonb",
    "adapted_evaluation" "jsonb",
    "evaluation_comparison" "jsonb",
    "human_emotional_state" "jsonb",
    "arc_progression" "jsonb",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "completed_at" timestamp with time zone,
    "control_human_emotional_state" "jsonb",
    "adapted_human_emotional_state" "jsonb",
    "control_arc_progression" "jsonb",
    "adapted_arc_progression" "jsonb",
    "conversation_winner" "jsonb",
    "control_user_message" "text",
    "adapted_user_message" "text"
);


ALTER TABLE "public"."conversation_turns" OWNER TO "postgres";


COMMENT ON COLUMN "public"."conversation_turns"."user_message" IS 'DEPRECATED: Legacy field for backward compatibility, use control_user_message/adapted_user_message';



COMMENT ON COLUMN "public"."conversation_turns"."control_response" IS 'Response from control (base model) endpoint';



COMMENT ON COLUMN "public"."conversation_turns"."adapted_response" IS 'Response from adapted (LoRA) endpoint';



COMMENT ON COLUMN "public"."conversation_turns"."human_emotional_state" IS 'Measured emotional state from human message: { primaryEmotion, intensity, valence, ... }';



COMMENT ON COLUMN "public"."conversation_turns"."arc_progression" IS 'Arc progression data: { detectedArc, progressionPercentage, onTrack, ... }';



COMMENT ON COLUMN "public"."conversation_turns"."status" IS 'Turn status: pending, generating, completed, failed';



COMMENT ON COLUMN "public"."conversation_turns"."control_user_message" IS 'User message sent to Control endpoint (enables dual-input A/B testing)';



COMMENT ON COLUMN "public"."conversation_turns"."adapted_user_message" IS 'User message sent to Adapted endpoint (enables dual-input A/B testing)';



CREATE TABLE IF NOT EXISTS "public"."conversations" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "conversation_id" "text" NOT NULL,
    "document_id" "uuid",
    "title" "text",
    "persona" "text",
    "emotion" "text",
    "topic" "text",
    "intent" "text",
    "tone" "text",
    "tier" "text" NOT NULL,
    "status" "text" NOT NULL,
    "category" "text"[] DEFAULT '{}'::"text"[],
    "quality_score" numeric(3,1),
    "quality_metrics" "jsonb" DEFAULT '{}'::"jsonb",
    "confidence_level" "text",
    "turn_count" integer DEFAULT 0,
    "total_tokens" integer DEFAULT 0,
    "estimated_cost_usd" numeric(10,4),
    "actual_cost_usd" numeric(10,4),
    "generation_duration_ms" integer,
    "approved_by" "uuid",
    "approved_at" timestamp with time zone,
    "reviewer_notes" "text",
    "parent_id" "uuid",
    "parent_type" "text",
    "parameters" "jsonb" DEFAULT '{}'::"jsonb",
    "review_history" "jsonb" DEFAULT '[]'::"jsonb",
    "error_message" "text",
    "retry_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "chunk_context" "text",
    "dimension_source" "jsonb",
    "reviewhistory" "jsonb" DEFAULT '[]'::"jsonb",
    "error_code" character varying(50),
    "error_details" "jsonb",
    "last_error_at" timestamp with time zone,
    "draft_data" "jsonb",
    "draft_saved_at" timestamp with time zone,
    "persona_id" "uuid",
    "emotional_arc_id" "uuid",
    "training_topic_id" "uuid",
    "scaffolding_snapshot" "jsonb",
    "file_url" "text",
    "file_size" bigint,
    "file_path" "text",
    "storage_bucket" character varying(100) DEFAULT 'conversation-files'::character varying,
    "template_id" "uuid",
    "persona_key" character varying(100),
    "emotional_arc_key" character varying(100),
    "topic_key" character varying(100),
    "conversation_name" character varying(255),
    "description" "text",
    "empathy_score" numeric(3,1),
    "clarity_score" numeric(3,1),
    "appropriateness_score" numeric(3,1),
    "brand_voice_alignment" numeric(3,1),
    "processing_status" character varying(50) DEFAULT 'completed'::character varying,
    "starting_emotion" character varying(100),
    "ending_emotion" character varying(100),
    "emotional_intensity_start" numeric(3,2),
    "emotional_intensity_end" numeric(3,2),
    "usage_count" integer DEFAULT 0,
    "last_exported_at" timestamp with time zone,
    "export_count" integer DEFAULT 0,
    "reviewed_by" "uuid",
    "reviewed_at" timestamp with time zone,
    "review_notes" "text",
    "expires_at" timestamp with time zone,
    "is_active" boolean DEFAULT true,
    "raw_response_url" "text",
    "raw_response_path" "text",
    "raw_response_size" bigint,
    "raw_stored_at" timestamp with time zone,
    "parse_attempts" integer DEFAULT 0,
    "last_parse_attempt_at" timestamp with time zone,
    "parse_error_message" "text",
    "parse_method_used" character varying(50),
    "requires_manual_review" boolean DEFAULT false,
    "enrichment_status" character varying(50) DEFAULT 'not_started'::character varying,
    "validation_report" "jsonb",
    "enriched_file_path" "text",
    "enriched_file_size" bigint,
    "enriched_at" timestamp with time zone,
    "enrichment_version" character varying(20) DEFAULT 'v1.0'::character varying,
    "enrichment_error" "text",
    "user_id" "uuid",
    "updated_by" "uuid",
    CONSTRAINT "conversations_confidence_level_check" CHECK (("confidence_level" = ANY (ARRAY['high'::"text", 'medium'::"text", 'low'::"text"]))),
    CONSTRAINT "conversations_enrichment_status_check" CHECK ((("enrichment_status")::"text" = ANY ((ARRAY['not_started'::character varying, 'validation_failed'::character varying, 'validated'::character varying, 'enrichment_in_progress'::character varying, 'enriched'::character varying, 'normalization_failed'::character varying, 'completed'::character varying])::"text"[]))),
    CONSTRAINT "conversations_parent_type_check" CHECK (("parent_type" = ANY (ARRAY['template'::"text", 'scenario'::"text", 'conversation'::"text"]))),
    CONSTRAINT "conversations_quality_score_check" CHECK ((("quality_score" >= (0)::numeric) AND ("quality_score" <= (10)::numeric))),
    CONSTRAINT "conversations_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'generated'::"text", 'pending_review'::"text", 'approved'::"text", 'rejected'::"text", 'needs_revision'::"text", 'none'::"text", 'failed'::"text"]))),
    CONSTRAINT "conversations_tier_check" CHECK (("tier" = ANY (ARRAY['template'::"text", 'scenario'::"text", 'edge_case'::"text"]))),
    CONSTRAINT "conversations_total_tokens_check" CHECK (("total_tokens" >= 0)),
    CONSTRAINT "conversations_turn_count_check" CHECK (("turn_count" >= 0))
);


ALTER TABLE "public"."conversations" OWNER TO "postgres";


COMMENT ON TABLE "public"."conversations" IS 'Core table storing all generated conversations with metadata and quality metrics';



COMMENT ON COLUMN "public"."conversations"."chunk_context" IS 'Cached chunk content for generation - denormalized for performance';



COMMENT ON COLUMN "public"."conversations"."dimension_source" IS 'Metadata from chunk dimensions: {chunkId, dimensions, confidence, extractedAt}';



COMMENT ON COLUMN "public"."conversations"."reviewhistory" IS 'Array of review actions: [{action, performedBy, timestamp, comment, reasons}]';



COMMENT ON COLUMN "public"."conversations"."file_url" IS 'DEPRECATED (2025-11-18): Signed URLs expire after 1 hour. Use file_path and generate signed URLs on-demand via ConversationStorageService.getPresignedDownloadUrl()';



COMMENT ON COLUMN "public"."conversations"."file_path" IS 'Storage path relative to conversation-files bucket. Used to generate signed URLs on-demand. Example: "00000000-0000-0000-0000-000000000000/abc123.../conversation.json"';



COMMENT ON COLUMN "public"."conversations"."raw_response_url" IS 'DEPRECATED (2025-11-18): Signed URLs expire after 1 hour. Use raw_response_path and generate signed URLs on-demand via ConversationStorageService.getPresignedDownloadUrl()';



COMMENT ON COLUMN "public"."conversations"."raw_response_path" IS 'Storage path for raw Claude response. Used to generate signed URLs on-demand. Example: "raw/00000000-0000-0000-0000-000000000000/abc123.json"';



COMMENT ON COLUMN "public"."conversations"."enrichment_status" IS 'Tracks progress through enrichment pipeline: not_started → validated → enriched → completed';



COMMENT ON COLUMN "public"."conversations"."validation_report" IS 'JSONB ValidationResult with blockers and warnings';



COMMENT ON COLUMN "public"."conversations"."enriched_file_path" IS 'Storage path to enriched.json (with predetermined fields populated)';



COMMENT ON COLUMN "public"."conversations"."enriched_file_size" IS 'Size of enriched JSON file in bytes';



COMMENT ON COLUMN "public"."conversations"."enriched_at" IS 'Timestamp when enrichment completed';



COMMENT ON COLUMN "public"."conversations"."enrichment_version" IS 'Version of enrichment logic used (for future migrations)';



COMMENT ON COLUMN "public"."conversations"."enrichment_error" IS 'Last error message if enrichment failed';



CREATE TABLE IF NOT EXISTS "public"."cost_records" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "job_id" "uuid",
    "cost_type" character varying(50) NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "details" "jsonb",
    "billing_period" "date" NOT NULL,
    "recorded_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."cost_records" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."datasets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" character varying(200) NOT NULL,
    "description" "text",
    "format" character varying(50) DEFAULT 'brightrun_lora_v4'::character varying,
    "status" character varying(50) DEFAULT 'uploading'::character varying,
    "storage_bucket" character varying(100) DEFAULT 'lora-datasets'::character varying,
    "storage_path" "text" NOT NULL,
    "file_name" character varying(255) NOT NULL,
    "file_size" bigint NOT NULL,
    "total_training_pairs" integer,
    "total_validation_pairs" integer,
    "total_tokens" bigint,
    "avg_turns_per_conversation" numeric(10,2),
    "avg_tokens_per_turn" numeric(10,2),
    "training_ready" boolean DEFAULT false,
    "validated_at" timestamp with time zone,
    "validation_errors" "jsonb",
    "sample_data" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deleted_at" timestamp with time zone,
    "updated_by" "uuid",
    "created_by" "uuid"
);


ALTER TABLE "public"."datasets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."documents" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "title" "text" NOT NULL,
    "content" "text",
    "summary" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "author_id" "uuid",
    "status" "text" DEFAULT 'pending'::"text",
    "file_path" "text",
    "file_size" integer,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "chunk_extraction_status" "text" DEFAULT 'not_started'::"text",
    "total_chunks_extracted" integer DEFAULT 0,
    "doc_version" "text",
    "source_type" "text",
    "source_url" "text",
    "doc_date" timestamp with time zone,
    "processing_progress" integer DEFAULT 0,
    "processing_error" "text",
    "processing_started_at" timestamp with time zone,
    "processing_completed_at" timestamp with time zone,
    "user_id" "uuid",
    CONSTRAINT "documents_chunk_extraction_status_check" CHECK (("chunk_extraction_status" = ANY (ARRAY['not_started'::"text", 'ready'::"text", 'extracting'::"text", 'completed'::"text", 'failed'::"text"]))),
    CONSTRAINT "documents_processing_progress_check" CHECK ((("processing_progress" >= 0) AND ("processing_progress" <= 100))),
    CONSTRAINT "documents_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'categorizing'::"text", 'completed'::"text", 'uploaded'::"text", 'processing'::"text", 'error'::"text"])))
);


ALTER TABLE "public"."documents" OWNER TO "postgres";


COMMENT ON COLUMN "public"."documents"."doc_version" IS 'User-provided document version (e.g., v1.0, 2024-Q3, Draft)';



COMMENT ON COLUMN "public"."documents"."source_type" IS 'Auto-detected file type: pdf, docx, txt, markdown, html, rtf';



COMMENT ON COLUMN "public"."documents"."source_url" IS 'Optional source URL or file path for provenance tracking';



COMMENT ON COLUMN "public"."documents"."doc_date" IS 'Original document creation/publication date (user-provided, not upload date)';



COMMENT ON COLUMN "public"."documents"."processing_progress" IS 'Text extraction progress percentage (0-100)';



COMMENT ON COLUMN "public"."documents"."processing_error" IS 'Error message if text extraction fails';



COMMENT ON COLUMN "public"."documents"."processing_started_at" IS 'Timestamp when text extraction started';



COMMENT ON COLUMN "public"."documents"."processing_completed_at" IS 'Timestamp when text extraction completed';



CREATE TABLE IF NOT EXISTS "public"."edge_cases" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" NOT NULL,
    "parent_scenario_id" "uuid" NOT NULL,
    "parent_scenario_name" "text" NOT NULL,
    "edge_case_type" "text" NOT NULL,
    "complexity" integer NOT NULL,
    "test_status" "text" DEFAULT 'not_tested'::"text",
    "test_results" "jsonb",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "edge_case_test_results_is_object" CHECK ((("test_results" IS NULL) OR ("jsonb_typeof"("test_results") = 'object'::"text"))),
    CONSTRAINT "edge_cases_complexity_check" CHECK ((("complexity" >= 1) AND ("complexity" <= 10))),
    CONSTRAINT "edge_cases_description_check" CHECK ((("length"("description") >= 1) AND ("length"("description") <= 2000))),
    CONSTRAINT "edge_cases_edge_case_type_check" CHECK (("edge_case_type" = ANY (ARRAY['error_condition'::"text", 'boundary_value'::"text", 'unusual_input'::"text", 'complex_combination'::"text", 'failure_scenario'::"text"]))),
    CONSTRAINT "edge_cases_test_status_check" CHECK (("test_status" = ANY (ARRAY['not_tested'::"text", 'passed'::"text", 'failed'::"text"]))),
    CONSTRAINT "edge_cases_title_check" CHECK ((("length"("title") >= 1) AND ("length"("title") <= 200)))
);


ALTER TABLE "public"."edge_cases" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."emotional_arcs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "arc_key" character varying(100) NOT NULL,
    "name" character varying(255) NOT NULL,
    "starting_emotion" character varying(100) NOT NULL,
    "starting_intensity_min" numeric(3,2),
    "starting_intensity_max" numeric(3,2),
    "ending_emotion" character varying(100) NOT NULL,
    "ending_intensity_min" numeric(3,2),
    "ending_intensity_max" numeric(3,2),
    "arc_strategy" "text",
    "key_principles" "text"[],
    "characteristic_phrases" "text"[],
    "response_techniques" "text"[],
    "avoid_tactics" "text"[],
    "typical_turn_count_min" integer,
    "typical_turn_count_max" integer,
    "complexity_baseline" integer,
    "tier" character varying(50) DEFAULT 'template'::character varying,
    "suitable_personas" "text"[],
    "suitable_topics" "text"[],
    "example_conversation_id" character varying(100),
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "usage_count" integer DEFAULT 0,
    "last_used_at" timestamp with time zone,
    "conversation_category" character varying(20) DEFAULT 'core'::character varying,
    CONSTRAINT "check_conversation_category" CHECK ((("conversation_category")::"text" = ANY ((ARRAY['core'::character varying, 'edge'::character varying])::"text"[]))),
    CONSTRAINT "emotional_arcs_complexity_baseline_check" CHECK ((("complexity_baseline" >= 1) AND ("complexity_baseline" <= 10))),
    CONSTRAINT "emotional_arcs_ending_intensity_max_check" CHECK ((("ending_intensity_max" >= (0)::numeric) AND ("ending_intensity_max" <= (1)::numeric))),
    CONSTRAINT "emotional_arcs_ending_intensity_min_check" CHECK ((("ending_intensity_min" >= (0)::numeric) AND ("ending_intensity_min" <= (1)::numeric))),
    CONSTRAINT "emotional_arcs_starting_intensity_max_check" CHECK ((("starting_intensity_max" >= (0)::numeric) AND ("starting_intensity_max" <= (1)::numeric))),
    CONSTRAINT "emotional_arcs_starting_intensity_min_check" CHECK ((("starting_intensity_min" >= (0)::numeric) AND ("starting_intensity_min" <= (1)::numeric)))
);


ALTER TABLE "public"."emotional_arcs" OWNER TO "postgres";


COMMENT ON TABLE "public"."emotional_arcs" IS 'Emotional transformation patterns';



COMMENT ON COLUMN "public"."emotional_arcs"."arc_key" IS 'Unique identifier like confusion_to_clarity';



COMMENT ON COLUMN "public"."emotional_arcs"."conversation_category" IS 'Categorizes arc as core (standard emotional journeys) or edge (boundary/crisis scenarios)';



CREATE TABLE IF NOT EXISTS "public"."error_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "error_id" character varying(100) NOT NULL,
    "error_type" character varying(50) NOT NULL,
    "error_code" character varying(50) NOT NULL,
    "error_message" "text" NOT NULL,
    "stack_trace" "text",
    "context" "jsonb",
    "user_id" "uuid",
    "conversation_id" "uuid",
    "request_id" character varying(100),
    "severity" character varying(20),
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "error_logs_severity_check" CHECK ((("severity")::"text" = ANY ((ARRAY['debug'::character varying, 'info'::character varying, 'warn'::character varying, 'error'::character varying, 'critical'::character varying])::"text"[])))
);


ALTER TABLE "public"."error_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."evaluation_prompts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "display_name" "text" NOT NULL,
    "description" "text",
    "version" integer DEFAULT 1 NOT NULL,
    "prompt_template" "text" NOT NULL,
    "expected_response_schema" "jsonb",
    "includes_arc_context" boolean DEFAULT false NOT NULL,
    "model" "text" DEFAULT 'claude-sonnet-4-20250514'::"text" NOT NULL,
    "max_tokens" integer DEFAULT 2000 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "is_default" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid"
);


ALTER TABLE "public"."evaluation_prompts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."export_logs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "export_id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "scope" "text",
    "format" "text",
    "filter_state" "jsonb" NOT NULL,
    "conversation_ids" "uuid"[],
    "conversation_count" integer NOT NULL,
    "file_name" "text",
    "file_size_bytes" bigint,
    "file_path" "text",
    "compressed" boolean DEFAULT false,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "quality_stats" "jsonb",
    "tier_distribution" "jsonb",
    "status" "text",
    "error_message" "text",
    "include_metadata" boolean DEFAULT true,
    "include_quality_scores" boolean DEFAULT true,
    "include_timestamps" boolean DEFAULT true,
    "include_approval_history" boolean DEFAULT false,
    "exported_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone,
    "downloaded_count" integer DEFAULT 0,
    "last_downloaded_at" timestamp with time zone,
    CONSTRAINT "export_logs_format_check" CHECK (("format" = ANY (ARRAY['json'::"text", 'jsonl'::"text", 'csv'::"text", 'markdown'::"text"]))),
    CONSTRAINT "export_logs_scope_check" CHECK (("scope" = ANY (ARRAY['selected'::"text", 'filtered'::"text", 'all'::"text"]))),
    CONSTRAINT "export_logs_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'processing'::"text", 'completed'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."export_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."export_logs" IS 'Audit trail of all data exports';



CREATE TABLE IF NOT EXISTS "public"."failed_generations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "conversation_id" "uuid",
    "run_id" "uuid",
    "prompt" "text" NOT NULL,
    "prompt_length" integer NOT NULL,
    "model" character varying(100) NOT NULL,
    "max_tokens" integer NOT NULL,
    "temperature" numeric(3,2),
    "structured_outputs_enabled" boolean DEFAULT true,
    "raw_response" "jsonb" NOT NULL,
    "response_content" "text",
    "stop_reason" character varying(50),
    "input_tokens" integer,
    "output_tokens" integer,
    "failure_type" character varying(50) NOT NULL,
    "truncation_pattern" character varying(50),
    "truncation_details" "text",
    "error_message" "text",
    "error_stack" "text",
    "raw_file_path" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "persona_id" "uuid",
    "emotional_arc_id" "uuid",
    "training_topic_id" "uuid",
    "template_id" "uuid",
    "user_id" "uuid"
);


ALTER TABLE "public"."failed_generations" OWNER TO "postgres";


COMMENT ON TABLE "public"."failed_generations" IS 'Stores failed conversation generations with full diagnostic context for root cause analysis';



COMMENT ON COLUMN "public"."failed_generations"."stop_reason" IS 'Claude API stop_reason: end_turn, max_tokens, stop_sequence, or tool_use';



COMMENT ON COLUMN "public"."failed_generations"."failure_type" IS 'Type of failure: truncation, parse_error, api_error, or validation_error';



COMMENT ON COLUMN "public"."failed_generations"."truncation_pattern" IS 'Detected truncation pattern (if failure_type = truncation)';



COMMENT ON COLUMN "public"."failed_generations"."raw_file_path" IS 'Path to comprehensive error report JSON in storage bucket';



CREATE TABLE IF NOT EXISTS "public"."generation_logs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "conversation_id" "text",
    "run_id" "uuid",
    "template_id" "uuid",
    "request_payload" "jsonb" NOT NULL,
    "response_payload" "jsonb",
    "model_used" "text",
    "parameters" "jsonb" DEFAULT '{}'::"jsonb",
    "temperature" numeric(3,2),
    "max_tokens" integer,
    "input_tokens" integer DEFAULT 0,
    "output_tokens" integer DEFAULT 0,
    "cost_usd" numeric(10,4),
    "duration_ms" integer,
    "status" "text",
    "error_message" "text",
    "error_code" "text",
    "retry_attempt" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "user_id" "uuid",
    CONSTRAINT "generation_logs_status_check" CHECK (("status" = ANY (ARRAY['success'::"text", 'failed'::"text", 'rate_limited'::"text", 'timeout'::"text"])))
);


ALTER TABLE "public"."generation_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."generation_logs" IS 'Audit trail of all AI generation requests and responses';



COMMENT ON COLUMN "public"."generation_logs"."conversation_id" IS 'TEXT identifier of the conversation this generation attempt was for. NULL if generation failed before conversation was created. Matches conversations.conversation_id type.';



CREATE TABLE IF NOT EXISTS "public"."index_usage_snapshots" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "snapshot_timestamp" timestamp with time zone DEFAULT "now"(),
    "schemaname" "text" NOT NULL,
    "tablename" "text" NOT NULL,
    "indexname" "text" NOT NULL,
    "idx_scan" bigint NOT NULL,
    "idx_tup_read" bigint,
    "idx_tup_fetch" bigint,
    "index_size_bytes" bigint,
    "table_size_bytes" bigint
);


ALTER TABLE "public"."index_usage_snapshots" OWNER TO "postgres";


COMMENT ON TABLE "public"."index_usage_snapshots" IS 'Periodic snapshots of index usage statistics';



CREATE TABLE IF NOT EXISTS "public"."legacy_conversation_turns" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "conversation_id" "uuid" NOT NULL,
    "turn_number" integer NOT NULL,
    "role" "text" NOT NULL,
    "content" "text" NOT NULL,
    "token_count" integer DEFAULT 0,
    "char_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "detected_emotion" character varying(100),
    "emotion_confidence" numeric(3,2),
    "emotional_intensity" numeric(3,2),
    "primary_strategy" character varying(255),
    "tone" character varying(100),
    "word_count" integer,
    "sentence_count" integer,
    CONSTRAINT "conversation_turns_role_check" CHECK (("role" = ANY (ARRAY['user'::"text", 'assistant'::"text"]))),
    CONSTRAINT "conversation_turns_turn_number_check" CHECK (("turn_number" > 0))
);


ALTER TABLE "public"."legacy_conversation_turns" OWNER TO "postgres";


COMMENT ON TABLE "public"."legacy_conversation_turns" IS 'LEGACY: Original conversation turns table from conversation generation system. 
   Being phased out in favor of multi_turn_conversations system. 
   Do not use for new features.';



CREATE TABLE IF NOT EXISTS "public"."maintenance_operations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "operation_type" "text" NOT NULL,
    "table_name" "text",
    "index_name" "text",
    "started_at" timestamp with time zone NOT NULL,
    "completed_at" timestamp with time zone,
    "duration_ms" bigint,
    "status" "text" NOT NULL,
    "initiated_by" "uuid" NOT NULL,
    "error_message" "text",
    "options" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "maintenance_operations_operation_type_check" CHECK (("operation_type" = ANY (ARRAY['VACUUM'::"text", 'VACUUM FULL'::"text", 'ANALYZE'::"text", 'REINDEX'::"text"]))),
    CONSTRAINT "maintenance_operations_status_check" CHECK (("status" = ANY (ARRAY['queued'::"text", 'running'::"text", 'completed'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."maintenance_operations" OWNER TO "postgres";


COMMENT ON TABLE "public"."maintenance_operations" IS 'Tracks database maintenance operations (VACUUM, ANALYZE, REINDEX) with execution history and status';



CREATE TABLE IF NOT EXISTS "public"."metrics_points" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "job_id" "uuid" NOT NULL,
    "timestamp" timestamp with time zone DEFAULT "now"(),
    "epoch" integer NOT NULL,
    "step" integer NOT NULL,
    "training_loss" numeric(10,6) NOT NULL,
    "validation_loss" numeric(10,6),
    "learning_rate" numeric(12,10) NOT NULL,
    "gradient_norm" numeric(10,6),
    "throughput" numeric(10,2),
    "gpu_utilization" numeric(5,2)
);


ALTER TABLE "public"."metrics_points" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."model_artifacts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "job_id" "uuid" NOT NULL,
    "dataset_id" "uuid" NOT NULL,
    "name" character varying(200) NOT NULL,
    "version" character varying(50) DEFAULT '1.0.0'::character varying,
    "description" "text",
    "status" character varying(50) DEFAULT 'stored'::character varying,
    "deployed_at" timestamp with time zone,
    "quality_metrics" "jsonb" NOT NULL,
    "training_summary" "jsonb" NOT NULL,
    "configuration" "jsonb" NOT NULL,
    "artifacts" "jsonb" NOT NULL,
    "parent_model_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."model_artifacts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."multi_turn_conversations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "job_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text",
    "system_prompt" "text",
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "turn_count" integer DEFAULT 0 NOT NULL,
    "max_turns" integer DEFAULT 10 NOT NULL,
    "control_total_tokens" integer DEFAULT 0,
    "adapted_total_tokens" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "completed_at" timestamp with time zone
);


ALTER TABLE "public"."multi_turn_conversations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" character varying(50) NOT NULL,
    "title" character varying(200) NOT NULL,
    "message" "text" NOT NULL,
    "priority" character varying(20) DEFAULT 'medium'::character varying,
    "read" boolean DEFAULT false,
    "action_url" "text",
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."performance_alerts" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "alert_type" "text" NOT NULL,
    "severity" "text" NOT NULL,
    "message" "text" NOT NULL,
    "details" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "resolved_at" timestamp with time zone,
    "resolved_by" "uuid",
    "resolution_notes" "text",
    "acknowledged_at" timestamp with time zone,
    "acknowledged_by" "uuid",
    CONSTRAINT "performance_alerts_alert_type_check" CHECK (("alert_type" = ANY (ARRAY['slow_query'::"text", 'high_bloat'::"text", 'unused_index'::"text", 'missing_index'::"text", 'connection_pool'::"text"]))),
    CONSTRAINT "performance_alerts_severity_check" CHECK (("severity" = ANY (ARRAY['info'::"text", 'warning'::"text", 'error'::"text", 'critical'::"text"])))
);


ALTER TABLE "public"."performance_alerts" OWNER TO "postgres";


COMMENT ON TABLE "public"."performance_alerts" IS 'System-generated performance alerts requiring attention';



COMMENT ON COLUMN "public"."performance_alerts"."acknowledged_at" IS 'Timestamp when alert was acknowledged by a user';



COMMENT ON COLUMN "public"."performance_alerts"."acknowledged_by" IS 'User who acknowledged the alert';



CREATE TABLE IF NOT EXISTS "public"."personas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "persona_key" character varying(100) NOT NULL,
    "name" character varying(255) NOT NULL,
    "archetype" character varying(255) NOT NULL,
    "age_range" character varying(50),
    "occupation" character varying(255),
    "income_range" character varying(100),
    "demographics" "jsonb",
    "financial_background" "text",
    "financial_situation" "text",
    "communication_style" "text",
    "emotional_baseline" character varying(100),
    "typical_questions" "text"[],
    "common_concerns" "text"[],
    "language_patterns" "text"[],
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "usage_count" integer DEFAULT 0,
    "last_used_at" timestamp with time zone
);


ALTER TABLE "public"."personas" OWNER TO "postgres";


COMMENT ON TABLE "public"."personas" IS 'Client persona definitions for conversation generation';



COMMENT ON COLUMN "public"."personas"."persona_key" IS 'Unique identifier like overwhelmed_avoider';



CREATE TABLE IF NOT EXISTS "public"."pipeline_base_models" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "model_id" "text" NOT NULL,
    "display_name" "text" NOT NULL,
    "parameter_count" "text",
    "context_length" integer,
    "license" "text",
    "docker_image" "text" DEFAULT 'runpod/worker-vllm:stable-cuda12.1.0'::"text" NOT NULL,
    "min_gpu_memory_gb" integer NOT NULL,
    "recommended_gpu_type" "text",
    "supports_lora" boolean DEFAULT true,
    "supports_quantization" boolean DEFAULT true,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."pipeline_base_models" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pipeline_evaluation_results" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "run_id" "uuid",
    "scenario_id" "text" NOT NULL,
    "conversation_turns" "jsonb" NOT NULL,
    "total_tokens" integer,
    "generation_time_ms" integer,
    "emotional_progression" "jsonb",
    "empathy_evaluation" "jsonb",
    "voice_consistency" "jsonb",
    "conversation_quality" "jsonb",
    "overall_evaluation" "jsonb",
    "claude_model_used" "text",
    "evaluation_tokens" integer,
    "raw_response" "text",
    "evaluated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."pipeline_evaluation_results" OWNER TO "postgres";


COMMENT ON TABLE "public"."pipeline_evaluation_results" IS 'Individual scenario evaluation results from Claude-as-Judge';



CREATE TABLE IF NOT EXISTS "public"."pipeline_evaluation_runs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "job_id" "uuid",
    "evaluation_type" "text" NOT NULL,
    "model_id" "text" NOT NULL,
    "adapter_path" "text",
    "total_scenarios" integer NOT NULL,
    "completed_scenarios" integer DEFAULT 0,
    "failed_scenarios" integer DEFAULT 0,
    "arc_completion_rate" double precision,
    "avg_progression_quality" double precision,
    "empathy_first_rate" double precision,
    "avg_empathy_score" double precision,
    "avg_voice_score" double precision,
    "helpful_rate" double precision,
    "avg_quality_score" double precision,
    "avg_overall_score" double precision,
    "per_arc_metrics" "jsonb",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "error" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."pipeline_evaluation_runs" OWNER TO "postgres";


COMMENT ON TABLE "public"."pipeline_evaluation_runs" IS 'Claude-as-Judge evaluation runs (baseline and trained)';



CREATE TABLE IF NOT EXISTS "public"."pipeline_inference_endpoints" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "job_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "endpoint_type" "text" NOT NULL,
    "runpod_endpoint_id" "text",
    "base_model" "text" NOT NULL,
    "adapter_path" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "health_check_url" "text",
    "last_health_check" timestamp with time zone,
    "idle_timeout_seconds" integer DEFAULT 300,
    "estimated_cost_per_hour" numeric(10,4),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "ready_at" timestamp with time zone,
    "terminated_at" timestamp with time zone,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "error_message" "text",
    "error_details" "jsonb",
    CONSTRAINT "pipeline_inference_endpoints_endpoint_type_check" CHECK (("endpoint_type" = ANY (ARRAY['control'::"text", 'adapted'::"text"]))),
    CONSTRAINT "pipeline_inference_endpoints_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'deploying'::"text", 'ready'::"text", 'failed'::"text", 'terminated'::"text"])))
);


ALTER TABLE "public"."pipeline_inference_endpoints" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pipeline_test_results" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "job_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "system_prompt" "text",
    "user_prompt" "text" NOT NULL,
    "control_response" "text",
    "control_generation_time_ms" integer,
    "control_tokens_used" integer,
    "adapted_response" "text",
    "adapted_generation_time_ms" integer,
    "adapted_tokens_used" integer,
    "evaluation_enabled" boolean DEFAULT false,
    "control_evaluation" "jsonb",
    "adapted_evaluation" "jsonb",
    "evaluation_comparison" "jsonb",
    "user_rating" "text",
    "user_notes" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "completed_at" timestamp with time zone,
    "error_message" "text",
    "evaluation_prompt_id" "uuid",
    CONSTRAINT "pipeline_test_results_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'generating'::"text", 'evaluating'::"text", 'completed'::"text", 'failed'::"text"]))),
    CONSTRAINT "pipeline_test_results_user_rating_check" CHECK (("user_rating" = ANY (ARRAY['control'::"text", 'adapted'::"text", 'tie'::"text", 'neither'::"text"])))
);


ALTER TABLE "public"."pipeline_test_results" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pipeline_training_jobs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "job_name" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "training_sensitivity" "text" DEFAULT 'medium'::"text" NOT NULL,
    "training_progression" "text" DEFAULT 'medium'::"text" NOT NULL,
    "training_repetition" integer DEFAULT 3 NOT NULL,
    "learning_rate" double precision DEFAULT 0.0001 NOT NULL,
    "batch_size" integer DEFAULT 4 NOT NULL,
    "epochs" integer DEFAULT 3 NOT NULL,
    "rank" integer DEFAULT 16 NOT NULL,
    "alpha" integer DEFAULT 32 NOT NULL,
    "dropout" double precision DEFAULT 0.05 NOT NULL,
    "dataset_id" "uuid",
    "dataset_name" "text",
    "dataset_file_path" "text",
    "engine_id" "text" DEFAULT 'emotional-alignment-v1'::"text" NOT NULL,
    "engine_name" "text" DEFAULT 'Emotional Alignment'::"text" NOT NULL,
    "engine_features" "jsonb" DEFAULT '[]'::"jsonb",
    "gpu_type" "text" DEFAULT 'NVIDIA A40'::"text" NOT NULL,
    "gpu_count" integer DEFAULT 1 NOT NULL,
    "estimated_cost" numeric(10,2),
    "actual_cost" numeric(10,2),
    "progress" integer DEFAULT 0,
    "current_epoch" integer DEFAULT 0,
    "current_step" integer DEFAULT 0,
    "total_steps" integer,
    "current_loss" double precision,
    "current_learning_rate" double precision,
    "tokens_per_second" double precision,
    "runpod_job_id" "text",
    "runpod_endpoint_id" "text",
    "final_loss" double precision,
    "training_time_seconds" integer,
    "adapter_file_path" "text",
    "adapter_download_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "error_message" "text",
    "error_details" "jsonb",
    "updated_by" "uuid",
    "created_by" "uuid"
);


ALTER TABLE "public"."pipeline_training_jobs" OWNER TO "postgres";


COMMENT ON TABLE "public"."pipeline_training_jobs" IS 'Main job tracking table for the pipeline module (separate from legacy training_jobs)';



CREATE TABLE IF NOT EXISTS "public"."pipeline_training_metrics" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "job_id" "uuid",
    "metric_id" "text" NOT NULL,
    "metric_name" "text" NOT NULL,
    "metric_level" "text" NOT NULL,
    "value" double precision NOT NULL,
    "unit" "text",
    "measured_at" timestamp with time zone DEFAULT "now"(),
    "measurement_version" "text",
    "measurement_method" "text",
    "step_number" integer,
    "epoch_number" integer,
    "raw_data" "jsonb"
);


ALTER TABLE "public"."pipeline_training_metrics" OWNER TO "postgres";


COMMENT ON TABLE "public"."pipeline_training_metrics" IS 'Time-series metrics storage for training runs';



CREATE TABLE IF NOT EXISTS "public"."prompt_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "template_name" character varying(255) NOT NULL,
    "description" "text",
    "category" character varying(100),
    "tier" character varying(50) DEFAULT 'template'::character varying,
    "template_text" "text" NOT NULL,
    "structure" "text",
    "variables" "jsonb",
    "tone" character varying(100),
    "complexity_baseline" integer,
    "style_notes" "text",
    "example_conversation" character varying(100),
    "quality_threshold" numeric(2,1),
    "required_elements" "text"[],
    "usage_count" integer DEFAULT 0,
    "rating" numeric(2,1) DEFAULT 0,
    "success_rate" numeric(3,2) DEFAULT 0,
    "version" integer DEFAULT 1,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "last_modified_by" "uuid",
    "last_modified" timestamp with time zone DEFAULT "now"(),
    "emotional_arc_id" "uuid",
    "emotional_arc_type" character varying(50),
    "suitable_personas" "text"[],
    "suitable_topics" "text"[],
    "methodology_principles" "text"[]
);


ALTER TABLE "public"."prompt_templates" OWNER TO "postgres";


COMMENT ON TABLE "public"."prompt_templates" IS 'Prompt templates for conversation generation';



COMMENT ON COLUMN "public"."prompt_templates"."emotional_arc_type" IS 'Primary selector for emotional arc';



CREATE TABLE IF NOT EXISTS "public"."query_performance_logs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "query_text" "text" NOT NULL,
    "query_hash" "text",
    "duration_ms" integer NOT NULL,
    "execution_timestamp" timestamp with time zone DEFAULT "now"(),
    "user_id" "uuid",
    "endpoint" "text",
    "parameters" "jsonb",
    "error_message" "text",
    "stack_trace" "text",
    "is_slow" boolean GENERATED ALWAYS AS (("duration_ms" > 500)) STORED,
    CONSTRAINT "query_performance_logs_duration_check" CHECK (("duration_ms" >= 0))
);


ALTER TABLE "public"."query_performance_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."query_performance_logs" IS 'Tracks query execution times for performance monitoring';



CREATE TABLE IF NOT EXISTS "public"."rag_documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "knowledge_base_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "file_name" "text" NOT NULL,
    "file_type" "text" NOT NULL,
    "file_size_bytes" bigint,
    "file_path" "text",
    "storage_bucket" "text" DEFAULT 'rag-documents'::"text",
    "original_text" "text",
    "description" "text",
    "status" "text" DEFAULT 'uploading'::"text" NOT NULL,
    "processing_started_at" timestamp with time zone,
    "processing_completed_at" timestamp with time zone,
    "processing_error" "text",
    "document_summary" "text",
    "topic_taxonomy" "jsonb" DEFAULT '[]'::"jsonb",
    "entity_list" "jsonb" DEFAULT '[]'::"jsonb",
    "ambiguity_list" "jsonb" DEFAULT '[]'::"jsonb",
    "section_count" integer DEFAULT 0,
    "fact_count" integer DEFAULT 0,
    "question_count" integer DEFAULT 0,
    "total_tokens_estimated" integer,
    "fast_mode" boolean DEFAULT false NOT NULL,
    "version" integer DEFAULT 1 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "content_hash" "text",
    "document_type" "text",
    "updated_by" "uuid",
    CONSTRAINT "rag_documents_file_type_check" CHECK (("file_type" = ANY (ARRAY['pdf'::"text", 'docx'::"text", 'txt'::"text", 'md'::"text"]))),
    CONSTRAINT "rag_documents_status_check" CHECK (("status" = ANY (ARRAY['uploading'::"text", 'processing'::"text", 'awaiting_questions'::"text", 'ready'::"text", 'error'::"text", 'archived'::"text"])))
);


ALTER TABLE "public"."rag_documents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rag_embedding_runs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "document_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "embedding_count" integer DEFAULT 0,
    "embedding_model" "text" NOT NULL,
    "status" "text" DEFAULT 'running'::"text",
    "pipeline_version" "text" DEFAULT 'single-pass'::"text",
    "started_at" timestamp with time zone DEFAULT "now"(),
    "completed_at" timestamp with time zone,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "rag_embedding_runs_status_check" CHECK (("status" = ANY (ARRAY['running'::"text", 'completed'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."rag_embedding_runs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rag_embeddings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "document_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "source_type" "text" NOT NULL,
    "source_id" "uuid" NOT NULL,
    "content_text" "text" NOT NULL,
    "embedding" "extensions"."vector"(1536),
    "embedding_model" "text" DEFAULT 'text-embedding-3-small'::"text" NOT NULL,
    "tier" integer NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "knowledge_base_id" "uuid",
    "run_id" "uuid",
    CONSTRAINT "rag_embeddings_source_type_check" CHECK (("source_type" = ANY (ARRAY['document'::"text", 'section'::"text", 'fact'::"text"]))),
    CONSTRAINT "rag_embeddings_tier_check" CHECK (("tier" = ANY (ARRAY[1, 2, 3])))
);


ALTER TABLE "public"."rag_embeddings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rag_expert_questions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "document_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "question_text" "text" NOT NULL,
    "question_reason" "text",
    "impact_level" "text" DEFAULT 'medium'::"text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "answer_text" "text",
    "answered_at" timestamp with time zone,
    "skipped" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "rag_expert_questions_impact_level_check" CHECK (("impact_level" = ANY (ARRAY['high'::"text", 'medium'::"text", 'low'::"text"])))
);


ALTER TABLE "public"."rag_expert_questions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rag_facts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "document_id" "uuid" NOT NULL,
    "section_id" "uuid",
    "user_id" "uuid" NOT NULL,
    "fact_type" "text" DEFAULT 'fact'::"text" NOT NULL,
    "content" "text" NOT NULL,
    "source_text" "text",
    "confidence" real DEFAULT 1.0,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "policy_id" "text",
    "rule_id" "text",
    "parent_fact_id" "uuid",
    "subsection" "text",
    "fact_category" "text",
    "content_tsv" "tsvector" GENERATED ALWAYS AS ("to_tsvector"('"english"'::"regconfig", "content")) STORED,
    "knowledge_base_id" "uuid",
    CONSTRAINT "rag_facts_fact_type_check" CHECK (("fact_type" = ANY (ARRAY['fact'::"text", 'entity'::"text", 'definition'::"text", 'relationship'::"text", 'table_row'::"text", 'policy_exception'::"text", 'policy_rule'::"text", 'limit'::"text", 'threshold'::"text", 'required_document'::"text", 'escalation_path'::"text", 'audit_field'::"text", 'cross_reference'::"text", 'narrative_fact'::"text"])))
);


ALTER TABLE "public"."rag_facts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rag_knowledge_bases" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "document_count" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "summary" "text",
    "updated_by" "uuid",
    CONSTRAINT "rag_knowledge_bases_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'archived'::"text"])))
);


ALTER TABLE "public"."rag_knowledge_bases" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rag_quality_scores" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "query_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "faithfulness_score" real,
    "answer_relevance_score" real,
    "context_relevance_score" real,
    "answer_completeness_score" real,
    "citation_accuracy_score" real,
    "composite_score" real,
    "evaluation_model" "text" DEFAULT 'claude-haiku'::"text" NOT NULL,
    "evaluation_details" "jsonb" DEFAULT '{}'::"jsonb",
    "evaluated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."rag_quality_scores" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rag_queries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "knowledge_base_id" "uuid" NOT NULL,
    "document_id" "uuid",
    "user_id" "uuid" NOT NULL,
    "query_text" "text" NOT NULL,
    "hyde_text" "text",
    "mode" "text" DEFAULT 'rag_only'::"text" NOT NULL,
    "retrieved_section_ids" "jsonb" DEFAULT '[]'::"jsonb",
    "retrieved_fact_ids" "jsonb" DEFAULT '[]'::"jsonb",
    "assembled_context" "text",
    "response_text" "text",
    "citations" "jsonb" DEFAULT '[]'::"jsonb",
    "self_eval_passed" boolean,
    "self_eval_score" real,
    "response_time_ms" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_feedback" "text",
    "feedback_at" timestamp with time zone,
    "query_scope" "text" DEFAULT 'document'::"text",
    CONSTRAINT "rag_queries_mode_check" CHECK (("mode" = ANY (ARRAY['rag_only'::"text", 'lora_only'::"text", 'rag_and_lora'::"text"]))),
    CONSTRAINT "rag_queries_query_scope_check" CHECK (("query_scope" = ANY (ARRAY['document'::"text", 'knowledge_base'::"text"])))
);


ALTER TABLE "public"."rag_queries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rag_sections" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "document_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "section_index" integer NOT NULL,
    "title" "text",
    "original_text" "text" NOT NULL,
    "summary" "text",
    "contextual_preamble" "text",
    "section_metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "token_count" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "text_tsv" "tsvector" GENERATED ALWAYS AS ("to_tsvector"('"english"'::"regconfig", ((COALESCE("title", ''::"text") || ' '::"text") || "original_text"))) STORED,
    "knowledge_base_id" "uuid"
);


ALTER TABLE "public"."rag_sections" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rag_test_reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "test_run_id" "text" NOT NULL,
    "document_id" "uuid" NOT NULL,
    "embedding_run_id" "uuid",
    "pass_rate" numeric(5,2) NOT NULL,
    "meets_target" boolean NOT NULL,
    "total_passed" integer NOT NULL,
    "total_failed" integer NOT NULL,
    "total_errored" integer NOT NULL,
    "avg_response_time_ms" integer NOT NULL,
    "avg_self_eval_score" numeric(5,4) NOT NULL,
    "total_duration_ms" integer NOT NULL,
    "breakdown" "jsonb" NOT NULL,
    "preflight" "jsonb" NOT NULL,
    "results" "jsonb" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."rag_test_reports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."scenarios" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "parent_template_id" "uuid" NOT NULL,
    "parent_template_name" "text" NOT NULL,
    "context" "text" NOT NULL,
    "parameter_values" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "variation_count" integer DEFAULT 0,
    "status" "text" DEFAULT 'draft'::"text",
    "quality_score" numeric(3,1) DEFAULT 0.0,
    "topic" "text" NOT NULL,
    "persona" "text" NOT NULL,
    "emotional_arc" "text" NOT NULL,
    "generation_status" "text" DEFAULT 'not_generated'::"text",
    "conversation_id" "uuid",
    "error_message" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "scenario_parameter_values_is_object" CHECK (("jsonb_typeof"("parameter_values") = 'object'::"text")),
    CONSTRAINT "scenarios_context_check" CHECK ((("length"("context") >= 1) AND ("length"("context") <= 5000))),
    CONSTRAINT "scenarios_emotional_arc_check" CHECK ((("length"("emotional_arc") >= 1) AND ("length"("emotional_arc") <= 100))),
    CONSTRAINT "scenarios_generation_status_check" CHECK (("generation_status" = ANY (ARRAY['not_generated'::"text", 'generated'::"text", 'error'::"text"]))),
    CONSTRAINT "scenarios_name_check" CHECK ((("length"("name") >= 1) AND ("length"("name") <= 200))),
    CONSTRAINT "scenarios_persona_check" CHECK ((("length"("persona") >= 1) AND ("length"("persona") <= 100))),
    CONSTRAINT "scenarios_quality_score_check" CHECK ((("quality_score" >= (0)::numeric) AND ("quality_score" <= (10)::numeric))),
    CONSTRAINT "scenarios_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'active'::"text", 'archived'::"text"]))),
    CONSTRAINT "scenarios_topic_check" CHECK ((("length"("topic") >= 1) AND ("length"("topic") <= 100))),
    CONSTRAINT "scenarios_variation_count_check" CHECK (("variation_count" >= 0))
);


ALTER TABLE "public"."scenarios" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."schema_migrations" (
    "version" bigint NOT NULL,
    "description" "text" NOT NULL,
    "applied_at" timestamp with time zone DEFAULT "now"(),
    "applied_by" "text",
    "execution_time_ms" integer,
    "checksum" "text",
    CONSTRAINT "valid_version" CHECK (("version" > 0))
);


ALTER TABLE "public"."schema_migrations" OWNER TO "postgres";


COMMENT ON TABLE "public"."schema_migrations" IS 'Tracks applied database migrations for version control';



CREATE TABLE IF NOT EXISTS "public"."table_bloat_snapshots" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "snapshot_timestamp" timestamp with time zone DEFAULT "now"(),
    "schemaname" "text" NOT NULL,
    "tablename" "text" NOT NULL,
    "actual_size_bytes" bigint NOT NULL,
    "estimated_size_bytes" bigint NOT NULL,
    "bloat_bytes" bigint GENERATED ALWAYS AS (("actual_size_bytes" - "estimated_size_bytes")) STORED,
    "bloat_ratio" numeric GENERATED ALWAYS AS (
CASE
    WHEN ("estimated_size_bytes" > 0) THEN "round"((((("actual_size_bytes" - "estimated_size_bytes"))::numeric / ("estimated_size_bytes")::numeric) * (100)::numeric), 2)
    ELSE (0)::numeric
END) STORED,
    "dead_tuples" bigint,
    "live_tuples" bigint
);


ALTER TABLE "public"."table_bloat_snapshots" OWNER TO "postgres";


COMMENT ON TABLE "public"."table_bloat_snapshots" IS 'Tracks table bloat over time for maintenance scheduling';



CREATE TABLE IF NOT EXISTS "public"."template_analytics" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "template_id" "uuid" NOT NULL,
    "period_start" timestamp with time zone NOT NULL,
    "period_end" timestamp with time zone NOT NULL,
    "generation_count" integer DEFAULT 0 NOT NULL,
    "success_count" integer DEFAULT 0 NOT NULL,
    "failure_count" integer DEFAULT 0 NOT NULL,
    "avg_quality_score" numeric(3,2),
    "min_quality_score" numeric(3,2),
    "max_quality_score" numeric(3,2),
    "approval_count" integer DEFAULT 0 NOT NULL,
    "rejection_count" integer DEFAULT 0 NOT NULL,
    "approval_rate" numeric(5,2),
    "avg_duration_ms" integer,
    "avg_cost_usd" numeric(10,6),
    "total_cost_usd" numeric(10,6),
    "calculated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."template_analytics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."templates" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "template_name" "text" NOT NULL,
    "description" "text",
    "category" "text",
    "tier" "text",
    "template_text" "text" NOT NULL,
    "structure" "text",
    "variables" "jsonb" DEFAULT '[]'::"jsonb",
    "tone" "text",
    "complexity_baseline" integer,
    "style_notes" "text",
    "example_conversation" "text",
    "quality_threshold" numeric(3,1),
    "required_elements" "text"[],
    "applicable_personas" "text"[],
    "applicable_emotions" "text"[],
    "applicable_topics" "text"[],
    "usage_count" integer DEFAULT 0,
    "rating" numeric(3,2) DEFAULT 0,
    "success_rate" numeric(5,2) DEFAULT 0,
    "version" integer DEFAULT 1,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "last_modified_by" "uuid",
    "last_modified" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "conversation_templates_complexity_baseline_check" CHECK ((("complexity_baseline" >= 1) AND ("complexity_baseline" <= 10))),
    CONSTRAINT "conversation_templates_tier_check" CHECK (("tier" = ANY (ARRAY['template'::"text", 'scenario'::"text", 'edge_case'::"text"])))
);


ALTER TABLE "public"."templates" OWNER TO "postgres";


COMMENT ON TABLE "public"."templates" IS 'Reusable templates for conversation generation (renamed from prompt_templates to avoid conflicts)';



CREATE TABLE IF NOT EXISTS "public"."training_file_conversations" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "training_file_id" "uuid" NOT NULL,
    "conversation_id" "uuid" NOT NULL,
    "added_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "added_by" "uuid"
);


ALTER TABLE "public"."training_file_conversations" OWNER TO "postgres";


COMMENT ON TABLE "public"."training_file_conversations" IS 'Junction table linking conversations to training files';



CREATE TABLE IF NOT EXISTS "public"."training_files" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "json_file_path" "text" NOT NULL,
    "jsonl_file_path" "text" NOT NULL,
    "storage_bucket" "text" DEFAULT 'training-files'::"text" NOT NULL,
    "conversation_count" integer DEFAULT 0 NOT NULL,
    "total_training_pairs" integer DEFAULT 0 NOT NULL,
    "json_file_size" bigint,
    "jsonl_file_size" bigint,
    "avg_quality_score" numeric(3,2),
    "min_quality_score" numeric(3,2),
    "max_quality_score" numeric(3,2),
    "human_reviewed_count" integer DEFAULT 0,
    "scaffolding_distribution" "jsonb" DEFAULT '{}'::"jsonb",
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "last_updated_at" timestamp with time zone,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid",
    "updated_by" "uuid",
    CONSTRAINT "training_files_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'archived'::"text", 'processing'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."training_files" OWNER TO "postgres";


COMMENT ON TABLE "public"."training_files" IS 'Aggregated LoRA training files containing multiple conversations';



COMMENT ON COLUMN "public"."training_files"."json_file_path" IS 'Storage path to full training JSON file (use getDownloadUrl for signed URL)';



COMMENT ON COLUMN "public"."training_files"."jsonl_file_path" IS 'Storage path to JSONL training file (use getDownloadUrl for signed URL)';



COMMENT ON COLUMN "public"."training_files"."scaffolding_distribution" IS 'JSON object with persona/arc/topic counts: {personas: {key: count}, emotional_arcs: {key: count}, training_topics: {key: count}}';



CREATE TABLE IF NOT EXISTS "public"."training_jobs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "dataset_id" "uuid" NOT NULL,
    "preset_id" character varying(50) NOT NULL,
    "hyperparameters" "jsonb" NOT NULL,
    "gpu_config" "jsonb" NOT NULL,
    "status" character varying(50) DEFAULT 'queued'::character varying,
    "current_stage" character varying(50) DEFAULT 'queued'::character varying,
    "progress" numeric(5,2) DEFAULT 0,
    "current_epoch" integer DEFAULT 0,
    "total_epochs" integer NOT NULL,
    "current_step" integer DEFAULT 0,
    "total_steps" integer,
    "current_metrics" "jsonb",
    "queued_at" timestamp with time zone DEFAULT "now"(),
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "estimated_completion_at" timestamp with time zone,
    "current_cost" numeric(10,2) DEFAULT 0,
    "estimated_total_cost" numeric(10,2) NOT NULL,
    "final_cost" numeric(10,2),
    "error_message" "text",
    "error_stack" "text",
    "retry_count" integer DEFAULT 0,
    "external_job_id" character varying(255),
    "artifact_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."training_jobs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."training_topics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "topic_key" character varying(100) NOT NULL,
    "name" character varying(255) NOT NULL,
    "category" character varying(100),
    "description" "text",
    "complexity_level" character varying(50),
    "typical_question_examples" "text"[],
    "key_concepts" "text"[],
    "suitable_personas" "text"[],
    "suitable_emotional_arcs" "text"[],
    "requires_specialist" boolean DEFAULT false,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "usage_count" integer DEFAULT 0,
    "last_used_at" timestamp with time zone
);


ALTER TABLE "public"."training_topics" OWNER TO "postgres";


COMMENT ON TABLE "public"."training_topics" IS 'Financial planning conversation topics';



COMMENT ON COLUMN "public"."training_topics"."topic_key" IS 'Unique identifier like hsa_vs_fsa';



CREATE TABLE IF NOT EXISTS "public"."user_profiles" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "email" "text" NOT NULL,
    "full_name" "text" NOT NULL,
    "role" "text" DEFAULT 'user'::"text",
    "organization_id" "uuid",
    "preferences" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "last_login_at" timestamp with time zone,
    "auth_provider" "text" DEFAULT 'email'::"text",
    "email_confirmed" boolean DEFAULT false,
    "phone" "text",
    "avatar_url" "text",
    "timezone" "text" DEFAULT 'UTC'::"text",
    "locale" "text" DEFAULT 'en'::"text",
    "is_active" boolean DEFAULT true,
    "terms_accepted_at" timestamp with time zone,
    "privacy_accepted_at" timestamp with time zone,
    "last_sign_in_at" timestamp with time zone,
    CONSTRAINT "user_profiles_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'user'::"text", 'viewer'::"text"])))
);


ALTER TABLE "public"."user_profiles" OWNER TO "postgres";


ALTER TABLE ONLY "public"."_orphaned_records"
    ADD CONSTRAINT "_orphaned_records_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."api_response_logs"
    ADD CONSTRAINT "api_response_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."backup_exports"
    ADD CONSTRAINT "backup_exports_backup_id_key" UNIQUE ("backup_id");



ALTER TABLE ONLY "public"."backup_exports"
    ADD CONSTRAINT "backup_exports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."batch_checkpoints"
    ADD CONSTRAINT "batch_checkpoints_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."batch_items"
    ADD CONSTRAINT "batch_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."batch_jobs"
    ADD CONSTRAINT "batch_jobs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."templates"
    ADD CONSTRAINT "conversation_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."templates"
    ADD CONSTRAINT "conversation_templates_template_name_key" UNIQUE ("template_name");



ALTER TABLE ONLY "public"."conversation_turns"
    ADD CONSTRAINT "conversation_turns_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_conversation_id_key" UNIQUE ("conversation_id");



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cost_records"
    ADD CONSTRAINT "cost_records_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."datasets"
    ADD CONSTRAINT "datasets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."datasets"
    ADD CONSTRAINT "datasets_storage_path_key" UNIQUE ("storage_path");



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."edge_cases"
    ADD CONSTRAINT "edge_cases_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."emotional_arcs"
    ADD CONSTRAINT "emotional_arcs_arc_key_key" UNIQUE ("arc_key");



ALTER TABLE ONLY "public"."emotional_arcs"
    ADD CONSTRAINT "emotional_arcs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."error_logs"
    ADD CONSTRAINT "error_logs_error_id_key" UNIQUE ("error_id");



ALTER TABLE ONLY "public"."error_logs"
    ADD CONSTRAINT "error_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."evaluation_prompts"
    ADD CONSTRAINT "evaluation_prompts_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."evaluation_prompts"
    ADD CONSTRAINT "evaluation_prompts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."export_logs"
    ADD CONSTRAINT "export_logs_export_id_key" UNIQUE ("export_id");



ALTER TABLE ONLY "public"."export_logs"
    ADD CONSTRAINT "export_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."failed_generations"
    ADD CONSTRAINT "failed_generations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."generation_logs"
    ADD CONSTRAINT "generation_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."index_usage_snapshots"
    ADD CONSTRAINT "index_usage_snapshots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."legacy_conversation_turns"
    ADD CONSTRAINT "legacy_conversation_turns_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."legacy_conversation_turns"
    ADD CONSTRAINT "legacy_unique_conversation_turn" UNIQUE ("conversation_id", "turn_number");



ALTER TABLE ONLY "public"."maintenance_operations"
    ADD CONSTRAINT "maintenance_operations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."metrics_points"
    ADD CONSTRAINT "metrics_points_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."model_artifacts"
    ADD CONSTRAINT "model_artifacts_job_id_key" UNIQUE ("job_id");



ALTER TABLE ONLY "public"."model_artifacts"
    ADD CONSTRAINT "model_artifacts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."multi_turn_conversations"
    ADD CONSTRAINT "multi_turn_conversations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."performance_alerts"
    ADD CONSTRAINT "performance_alerts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."personas"
    ADD CONSTRAINT "personas_persona_key_key" UNIQUE ("persona_key");



ALTER TABLE ONLY "public"."personas"
    ADD CONSTRAINT "personas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pipeline_base_models"
    ADD CONSTRAINT "pipeline_base_models_model_id_key" UNIQUE ("model_id");



ALTER TABLE ONLY "public"."pipeline_base_models"
    ADD CONSTRAINT "pipeline_base_models_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pipeline_evaluation_results"
    ADD CONSTRAINT "pipeline_evaluation_results_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pipeline_evaluation_runs"
    ADD CONSTRAINT "pipeline_evaluation_runs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pipeline_inference_endpoints"
    ADD CONSTRAINT "pipeline_inference_endpoints_job_id_endpoint_type_key" UNIQUE ("job_id", "endpoint_type");



ALTER TABLE ONLY "public"."pipeline_inference_endpoints"
    ADD CONSTRAINT "pipeline_inference_endpoints_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pipeline_test_results"
    ADD CONSTRAINT "pipeline_test_results_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pipeline_training_jobs"
    ADD CONSTRAINT "pipeline_training_jobs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pipeline_training_metrics"
    ADD CONSTRAINT "pipeline_training_metrics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."prompt_templates"
    ADD CONSTRAINT "prompt_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."prompt_templates"
    ADD CONSTRAINT "prompt_templates_template_name_key" UNIQUE ("template_name");



ALTER TABLE ONLY "public"."query_performance_logs"
    ADD CONSTRAINT "query_performance_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rag_documents"
    ADD CONSTRAINT "rag_documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rag_embedding_runs"
    ADD CONSTRAINT "rag_embedding_runs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rag_embeddings"
    ADD CONSTRAINT "rag_embeddings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rag_expert_questions"
    ADD CONSTRAINT "rag_expert_questions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rag_facts"
    ADD CONSTRAINT "rag_facts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rag_knowledge_bases"
    ADD CONSTRAINT "rag_knowledge_bases_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rag_quality_scores"
    ADD CONSTRAINT "rag_quality_scores_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rag_queries"
    ADD CONSTRAINT "rag_queries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rag_sections"
    ADD CONSTRAINT "rag_sections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rag_test_reports"
    ADD CONSTRAINT "rag_test_reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."scenarios"
    ADD CONSTRAINT "scenarios_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."schema_migrations"
    ADD CONSTRAINT "schema_migrations_pkey" PRIMARY KEY ("version");



ALTER TABLE ONLY "public"."table_bloat_snapshots"
    ADD CONSTRAINT "table_bloat_snapshots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."template_analytics"
    ADD CONSTRAINT "template_analytics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."template_analytics"
    ADD CONSTRAINT "template_analytics_template_id_period_start_period_end_key" UNIQUE ("template_id", "period_start", "period_end");



ALTER TABLE ONLY "public"."training_file_conversations"
    ADD CONSTRAINT "training_file_conversations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."training_files"
    ADD CONSTRAINT "training_files_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."training_files"
    ADD CONSTRAINT "training_files_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."training_jobs"
    ADD CONSTRAINT "training_jobs_external_job_id_key" UNIQUE ("external_job_id");



ALTER TABLE ONLY "public"."training_jobs"
    ADD CONSTRAINT "training_jobs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."training_topics"
    ADD CONSTRAINT "training_topics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."training_topics"
    ADD CONSTRAINT "training_topics_topic_key_key" UNIQUE ("topic_key");



ALTER TABLE ONLY "public"."table_bloat_snapshots"
    ADD CONSTRAINT "unique_bloat_snapshot" UNIQUE ("snapshot_timestamp", "schemaname", "tablename");



ALTER TABLE ONLY "public"."index_usage_snapshots"
    ADD CONSTRAINT "unique_snapshot" UNIQUE ("snapshot_timestamp", "schemaname", "tablename", "indexname");



ALTER TABLE ONLY "public"."training_file_conversations"
    ADD CONSTRAINT "unique_training_file_conversation" UNIQUE ("training_file_id", "conversation_id");



ALTER TABLE ONLY "public"."conversation_turns"
    ADD CONSTRAINT "unique_turn_per_conversation" UNIQUE ("conversation_id", "turn_number");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_alerts_severity" ON "public"."performance_alerts" USING "btree" ("severity", "created_at" DESC);



CREATE INDEX "idx_alerts_type" ON "public"."performance_alerts" USING "btree" ("alert_type");



CREATE INDEX "idx_alerts_unresolved" ON "public"."performance_alerts" USING "btree" ("created_at" DESC) WHERE ("resolved_at" IS NULL);



CREATE INDEX "idx_analytics_calculated" ON "public"."template_analytics" USING "btree" ("calculated_at" DESC);



CREATE INDEX "idx_analytics_period" ON "public"."template_analytics" USING "btree" ("period_start", "period_end");



CREATE INDEX "idx_analytics_template" ON "public"."template_analytics" USING "btree" ("template_id");



CREATE INDEX "idx_api_response_logs_chunk_id" ON "public"."api_response_logs" USING "btree" ("chunk_id");



CREATE INDEX "idx_api_response_logs_created_at" ON "public"."api_response_logs" USING "btree" ("created_at");



CREATE INDEX "idx_api_response_logs_run_id" ON "public"."api_response_logs" USING "btree" ("run_id");



CREATE INDEX "idx_api_response_logs_template_type" ON "public"."api_response_logs" USING "btree" ("template_type");



CREATE INDEX "idx_api_response_logs_timestamp" ON "public"."api_response_logs" USING "btree" ("timestamp");



CREATE INDEX "idx_backup_exports_created_at" ON "public"."backup_exports" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_backup_exports_expires_at" ON "public"."backup_exports" USING "btree" ("expires_at");



CREATE INDEX "idx_backup_exports_user_id" ON "public"."backup_exports" USING "btree" ("user_id");



CREATE INDEX "idx_batch_checkpoints_job_id" ON "public"."batch_checkpoints" USING "btree" ("job_id");



CREATE INDEX "idx_batch_checkpoints_updated_at" ON "public"."batch_checkpoints" USING "btree" ("updated_at" DESC);



CREATE INDEX "idx_batch_items_conversation_id" ON "public"."batch_items" USING "btree" ("conversation_id") WHERE ("conversation_id" IS NOT NULL);



CREATE INDEX "idx_batch_items_job_id" ON "public"."batch_items" USING "btree" ("batch_job_id");



CREATE INDEX "idx_batch_items_status" ON "public"."batch_items" USING "btree" ("status");



CREATE INDEX "idx_batch_jobs_created_at" ON "public"."batch_jobs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_batch_jobs_created_by" ON "public"."batch_jobs" USING "btree" ("created_by");



CREATE INDEX "idx_batch_jobs_job_type" ON "public"."batch_jobs" USING "btree" ("job_type");



CREATE INDEX "idx_batch_jobs_priority" ON "public"."batch_jobs" USING "btree" ("priority" DESC);



CREATE INDEX "idx_batch_jobs_status" ON "public"."batch_jobs" USING "btree" ("status");



CREATE INDEX "idx_batch_jobs_target_tier" ON "public"."batch_jobs" USING "btree" ("target_tier");



CREATE INDEX "idx_bloat_snapshots_ratio" ON "public"."table_bloat_snapshots" USING "btree" ("bloat_ratio" DESC) WHERE ("bloat_ratio" > (20)::numeric);



CREATE INDEX "idx_bloat_snapshots_time" ON "public"."table_bloat_snapshots" USING "btree" ("snapshot_timestamp" DESC);



CREATE INDEX "idx_conversation_templates_category" ON "public"."templates" USING "btree" ("category");



CREATE INDEX "idx_conversation_templates_created_by" ON "public"."templates" USING "btree" ("created_by");



CREATE INDEX "idx_conversation_templates_is_active" ON "public"."templates" USING "btree" ("is_active");



CREATE INDEX "idx_conversation_templates_personas" ON "public"."templates" USING "gin" ("applicable_personas");



CREATE INDEX "idx_conversation_templates_rating" ON "public"."templates" USING "btree" ("rating" DESC);



CREATE INDEX "idx_conversation_templates_tier" ON "public"."templates" USING "btree" ("tier");



CREATE INDEX "idx_conversation_templates_usage" ON "public"."templates" USING "btree" ("usage_count" DESC);



CREATE INDEX "idx_conversation_turns_conversation_id" ON "public"."conversation_turns" USING "btree" ("conversation_id");



CREATE INDEX "idx_conversation_turns_evaluator" ON "public"."conversation_turns" USING "btree" ("evaluation_prompt_id");



CREATE INDEX "idx_conversation_turns_status" ON "public"."conversation_turns" USING "btree" ("status");



CREATE INDEX "idx_conversation_turns_turn_number" ON "public"."conversation_turns" USING "btree" ("conversation_id", "turn_number");



CREATE INDEX "idx_conversations_approved_at" ON "public"."conversations" USING "btree" ("approved_at" DESC) WHERE ("approved_at" IS NOT NULL);



CREATE INDEX "idx_conversations_approved_by" ON "public"."conversations" USING "btree" ("approved_by");



CREATE INDEX "idx_conversations_category_gin" ON "public"."conversations" USING "gin" ("category");



CREATE INDEX "idx_conversations_conversation_id" ON "public"."conversations" USING "btree" ("conversation_id");



CREATE INDEX "idx_conversations_created_at" ON "public"."conversations" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_conversations_created_by" ON "public"."conversations" USING "btree" ("created_by");



CREATE INDEX "idx_conversations_dimension_source" ON "public"."conversations" USING "gin" ("dimension_source") WHERE ("dimension_source" IS NOT NULL);



CREATE INDEX "idx_conversations_document_id" ON "public"."conversations" USING "btree" ("document_id");



CREATE INDEX "idx_conversations_emotion" ON "public"."conversations" USING "btree" ("emotion");



CREATE INDEX "idx_conversations_emotional_arc_id" ON "public"."conversations" USING "btree" ("emotional_arc_id");



CREATE INDEX "idx_conversations_enrichment_status" ON "public"."conversations" USING "btree" ("enrichment_status");



CREATE INDEX "idx_conversations_error_code" ON "public"."conversations" USING "btree" ("error_code") WHERE ("error_code" IS NOT NULL);



CREATE INDEX "idx_conversations_parameters_gin" ON "public"."conversations" USING "gin" ("parameters" "jsonb_path_ops");



CREATE INDEX "idx_conversations_parent_id" ON "public"."conversations" USING "btree" ("parent_id");



CREATE INDEX "idx_conversations_parse_attempts" ON "public"."conversations" USING "btree" ("parse_attempts") WHERE ("parse_attempts" > 0);



CREATE INDEX "idx_conversations_pending_review" ON "public"."conversations" USING "btree" ("quality_score", "created_at") WHERE ("status" = 'pending_review'::"text");



CREATE INDEX "idx_conversations_persona" ON "public"."conversations" USING "btree" ("persona");



CREATE INDEX "idx_conversations_persona_id" ON "public"."conversations" USING "btree" ("persona_id");



CREATE INDEX "idx_conversations_processing_status" ON "public"."conversations" USING "btree" ("processing_status");



CREATE INDEX "idx_conversations_quality_metrics_gin" ON "public"."conversations" USING "gin" ("quality_metrics" "jsonb_path_ops");



CREATE INDEX "idx_conversations_quality_score" ON "public"."conversations" USING "btree" ("quality_score");



CREATE INDEX "idx_conversations_requires_review" ON "public"."conversations" USING "btree" ("requires_manual_review") WHERE ("requires_manual_review" = true);



CREATE INDEX "idx_conversations_review_history" ON "public"."conversations" USING "gin" ("reviewhistory");



CREATE INDEX "idx_conversations_status" ON "public"."conversations" USING "btree" ("status");



CREATE INDEX "idx_conversations_status_quality" ON "public"."conversations" USING "btree" ("status", "quality_score");



CREATE INDEX "idx_conversations_text_search" ON "public"."conversations" USING "gin" ("to_tsvector"('"english"'::"regconfig", ((((COALESCE("title", ''::"text") || ' '::"text") || COALESCE("persona", ''::"text")) || ' '::"text") || COALESCE("emotion", ''::"text"))));



CREATE INDEX "idx_conversations_tier" ON "public"."conversations" USING "btree" ("tier");



CREATE INDEX "idx_conversations_tier_status" ON "public"."conversations" USING "btree" ("tier", "status", "created_at" DESC);



CREATE INDEX "idx_conversations_training_topic_id" ON "public"."conversations" USING "btree" ("training_topic_id");



CREATE INDEX "idx_cost_records_billing_period" ON "public"."cost_records" USING "btree" ("user_id", "billing_period" DESC);



CREATE INDEX "idx_cost_records_user_id" ON "public"."cost_records" USING "btree" ("user_id");



CREATE INDEX "idx_datasets_created_at" ON "public"."datasets" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_datasets_status" ON "public"."datasets" USING "btree" ("status") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_datasets_user_id" ON "public"."datasets" USING "btree" ("user_id");



CREATE INDEX "idx_documents_author_id" ON "public"."documents" USING "btree" ("author_id");



CREATE INDEX "idx_documents_created_at" ON "public"."documents" USING "btree" ("created_at");



CREATE INDEX "idx_documents_source_type" ON "public"."documents" USING "btree" ("source_type");



CREATE INDEX "idx_documents_status" ON "public"."documents" USING "btree" ("status");



CREATE INDEX "idx_documents_status_updated" ON "public"."documents" USING "btree" ("status", "updated_at") WHERE ("status" = ANY (ARRAY['uploaded'::"text", 'processing'::"text"]));



CREATE INDEX "idx_edge_cases_complexity" ON "public"."edge_cases" USING "btree" ("complexity" DESC);



CREATE INDEX "idx_edge_cases_created_at" ON "public"."edge_cases" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_edge_cases_created_by" ON "public"."edge_cases" USING "btree" ("created_by");



CREATE INDEX "idx_edge_cases_parent_scenario" ON "public"."edge_cases" USING "btree" ("parent_scenario_id");



CREATE INDEX "idx_edge_cases_scenario_status" ON "public"."edge_cases" USING "btree" ("parent_scenario_id", "test_status");



CREATE INDEX "idx_edge_cases_test_results_gin" ON "public"."edge_cases" USING "gin" ("test_results");



CREATE INDEX "idx_edge_cases_test_status" ON "public"."edge_cases" USING "btree" ("test_status");



CREATE INDEX "idx_edge_cases_type" ON "public"."edge_cases" USING "btree" ("edge_case_type");



CREATE INDEX "idx_emotional_arcs_active" ON "public"."emotional_arcs" USING "btree" ("is_active");



CREATE INDEX "idx_emotional_arcs_ending" ON "public"."emotional_arcs" USING "btree" ("ending_emotion");



CREATE INDEX "idx_emotional_arcs_key" ON "public"."emotional_arcs" USING "btree" ("arc_key");



CREATE INDEX "idx_emotional_arcs_starting" ON "public"."emotional_arcs" USING "btree" ("starting_emotion");



CREATE INDEX "idx_emotional_arcs_tier" ON "public"."emotional_arcs" USING "btree" ("tier");



CREATE INDEX "idx_endpoints_job_id" ON "public"."pipeline_inference_endpoints" USING "btree" ("job_id");



CREATE INDEX "idx_endpoints_status" ON "public"."pipeline_inference_endpoints" USING "btree" ("status");



CREATE INDEX "idx_endpoints_user_id" ON "public"."pipeline_inference_endpoints" USING "btree" ("user_id");



CREATE INDEX "idx_error_logs_code" ON "public"."error_logs" USING "btree" ("error_code");



CREATE INDEX "idx_error_logs_conversation_id" ON "public"."error_logs" USING "btree" ("conversation_id");



CREATE INDEX "idx_error_logs_created_at" ON "public"."error_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_error_logs_severity" ON "public"."error_logs" USING "btree" ("severity");



CREATE INDEX "idx_error_logs_type" ON "public"."error_logs" USING "btree" ("error_type");



CREATE INDEX "idx_error_logs_user_id" ON "public"."error_logs" USING "btree" ("user_id");



CREATE INDEX "idx_eval_results_run_id" ON "public"."pipeline_evaluation_results" USING "btree" ("run_id");



CREATE INDEX "idx_eval_results_scenario" ON "public"."pipeline_evaluation_results" USING "btree" ("scenario_id");



CREATE INDEX "idx_eval_runs_job_id" ON "public"."pipeline_evaluation_runs" USING "btree" ("job_id");



CREATE INDEX "idx_eval_runs_type" ON "public"."pipeline_evaluation_runs" USING "btree" ("evaluation_type");



CREATE INDEX "idx_evaluation_prompts_active" ON "public"."evaluation_prompts" USING "btree" ("is_active") WHERE ("is_active" = true);



CREATE UNIQUE INDEX "idx_evaluation_prompts_default" ON "public"."evaluation_prompts" USING "btree" ("is_default") WHERE ("is_default" = true);



CREATE INDEX "idx_export_logs_export_id" ON "public"."export_logs" USING "btree" ("export_id");



CREATE INDEX "idx_export_logs_exported_at" ON "public"."export_logs" USING "btree" ("exported_at" DESC);



CREATE INDEX "idx_export_logs_format" ON "public"."export_logs" USING "btree" ("format");



CREATE INDEX "idx_export_logs_status" ON "public"."export_logs" USING "btree" ("status");



CREATE INDEX "idx_export_logs_user_id" ON "public"."export_logs" USING "btree" ("user_id");



CREATE INDEX "idx_failed_generations_conversation_id" ON "public"."failed_generations" USING "btree" ("conversation_id") WHERE ("conversation_id" IS NOT NULL);



CREATE INDEX "idx_failed_generations_created_at" ON "public"."failed_generations" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_failed_generations_created_by" ON "public"."failed_generations" USING "btree" ("created_by");



CREATE INDEX "idx_failed_generations_failure_type" ON "public"."failed_generations" USING "btree" ("failure_type");



CREATE INDEX "idx_failed_generations_pattern" ON "public"."failed_generations" USING "btree" ("truncation_pattern") WHERE ("truncation_pattern" IS NOT NULL);



CREATE INDEX "idx_failed_generations_run_id" ON "public"."failed_generations" USING "btree" ("run_id") WHERE ("run_id" IS NOT NULL);



CREATE INDEX "idx_failed_generations_stop_reason" ON "public"."failed_generations" USING "btree" ("stop_reason");



CREATE INDEX "idx_failed_generations_truncation_pattern" ON "public"."failed_generations" USING "btree" ("truncation_pattern") WHERE ("truncation_pattern" IS NOT NULL);



CREATE INDEX "idx_generation_logs_conversation_id" ON "public"."generation_logs" USING "btree" ("conversation_id") WHERE ("conversation_id" IS NOT NULL);



CREATE INDEX "idx_generation_logs_created_at" ON "public"."generation_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_generation_logs_created_by" ON "public"."generation_logs" USING "btree" ("created_by");



CREATE INDEX "idx_generation_logs_model" ON "public"."generation_logs" USING "btree" ("model_used");



CREATE INDEX "idx_generation_logs_run_id" ON "public"."generation_logs" USING "btree" ("run_id");



CREATE INDEX "idx_generation_logs_status" ON "public"."generation_logs" USING "btree" ("status");



CREATE INDEX "idx_generation_logs_template_id" ON "public"."generation_logs" USING "btree" ("template_id");



CREATE INDEX "idx_legacy_conversation_turns_conv_turn" ON "public"."legacy_conversation_turns" USING "btree" ("conversation_id", "turn_number");



CREATE INDEX "idx_legacy_conversation_turns_conversation_id" ON "public"."legacy_conversation_turns" USING "btree" ("conversation_id");



CREATE INDEX "idx_legacy_conversation_turns_role" ON "public"."legacy_conversation_turns" USING "btree" ("role");



CREATE INDEX "idx_legacy_turns_conversation_id" ON "public"."legacy_conversation_turns" USING "btree" ("conversation_id");



CREATE INDEX "idx_legacy_turns_conversation_turn" ON "public"."legacy_conversation_turns" USING "btree" ("conversation_id", "turn_number");



CREATE INDEX "idx_legacy_turns_role" ON "public"."legacy_conversation_turns" USING "btree" ("role");



CREATE INDEX "idx_maintenance_operations_created_at" ON "public"."maintenance_operations" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_maintenance_operations_status" ON "public"."maintenance_operations" USING "btree" ("status");



CREATE INDEX "idx_maintenance_operations_table" ON "public"."maintenance_operations" USING "btree" ("table_name");



CREATE INDEX "idx_metrics_points_job_id" ON "public"."metrics_points" USING "btree" ("job_id");



CREATE INDEX "idx_metrics_points_timestamp" ON "public"."metrics_points" USING "btree" ("job_id", "timestamp" DESC);



CREATE INDEX "idx_model_artifacts_job_id" ON "public"."model_artifacts" USING "btree" ("job_id");



CREATE INDEX "idx_model_artifacts_user_id" ON "public"."model_artifacts" USING "btree" ("user_id");



CREATE INDEX "idx_multi_turn_conversations_created_at" ON "public"."multi_turn_conversations" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_multi_turn_conversations_job_id" ON "public"."multi_turn_conversations" USING "btree" ("job_id");



CREATE INDEX "idx_multi_turn_conversations_status" ON "public"."multi_turn_conversations" USING "btree" ("status");



CREATE INDEX "idx_multi_turn_conversations_user_id" ON "public"."multi_turn_conversations" USING "btree" ("user_id");



CREATE INDEX "idx_notifications_read" ON "public"."notifications" USING "btree" ("user_id", "read", "created_at" DESC);



CREATE INDEX "idx_notifications_user_id" ON "public"."notifications" USING "btree" ("user_id");



CREATE INDEX "idx_performance_alerts_created" ON "public"."performance_alerts" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_performance_alerts_resolved" ON "public"."performance_alerts" USING "btree" ("resolved_at");



CREATE INDEX "idx_performance_alerts_severity" ON "public"."performance_alerts" USING "btree" ("severity");



CREATE INDEX "idx_personas_active" ON "public"."personas" USING "btree" ("is_active");



CREATE INDEX "idx_personas_archetype" ON "public"."personas" USING "btree" ("archetype");



CREATE INDEX "idx_personas_key" ON "public"."personas" USING "btree" ("persona_key");



CREATE INDEX "idx_pipeline_jobs_created_at" ON "public"."pipeline_training_jobs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_pipeline_jobs_status" ON "public"."pipeline_training_jobs" USING "btree" ("status");



CREATE INDEX "idx_pipeline_jobs_user_id" ON "public"."pipeline_training_jobs" USING "btree" ("user_id");



CREATE INDEX "idx_pipeline_metrics_job_id" ON "public"."pipeline_training_metrics" USING "btree" ("job_id");



CREATE INDEX "idx_pipeline_metrics_metric_id" ON "public"."pipeline_training_metrics" USING "btree" ("metric_id");



CREATE INDEX "idx_pipeline_metrics_step" ON "public"."pipeline_training_metrics" USING "btree" ("step_number");



CREATE INDEX "idx_pipeline_test_results_evaluator" ON "public"."pipeline_test_results" USING "btree" ("evaluation_prompt_id");



CREATE INDEX "idx_prompt_templates_active" ON "public"."prompt_templates" USING "btree" ("is_active");



CREATE INDEX "idx_prompt_templates_arc_type" ON "public"."prompt_templates" USING "btree" ("emotional_arc_type");



CREATE INDEX "idx_prompt_templates_emotional_arc" ON "public"."prompt_templates" USING "btree" ("emotional_arc_id");



CREATE INDEX "idx_prompt_templates_tier" ON "public"."prompt_templates" USING "btree" ("tier");



CREATE INDEX "idx_query_perf_hash" ON "public"."query_performance_logs" USING "btree" ("query_hash");



CREATE INDEX "idx_query_perf_slow" ON "public"."query_performance_logs" USING "btree" ("is_slow", "duration_ms" DESC) WHERE ("is_slow" = true);



CREATE INDEX "idx_query_perf_timestamp" ON "public"."query_performance_logs" USING "btree" ("execution_timestamp" DESC);



CREATE INDEX "idx_query_perf_user" ON "public"."query_performance_logs" USING "btree" ("user_id");



CREATE INDEX "idx_rag_docs_kb" ON "public"."rag_documents" USING "btree" ("knowledge_base_id");



CREATE INDEX "idx_rag_docs_status" ON "public"."rag_documents" USING "btree" ("status");



CREATE INDEX "idx_rag_docs_user" ON "public"."rag_documents" USING "btree" ("user_id");



CREATE INDEX "idx_rag_documents_hash" ON "public"."rag_documents" USING "btree" ("content_hash") WHERE ("content_hash" IS NOT NULL);



CREATE INDEX "idx_rag_embedding_runs_document" ON "public"."rag_embedding_runs" USING "btree" ("document_id", "created_at" DESC);



CREATE INDEX "idx_rag_embedding_runs_status" ON "public"."rag_embedding_runs" USING "btree" ("status");



CREATE INDEX "idx_rag_embeddings_doc" ON "public"."rag_embeddings" USING "btree" ("document_id");



CREATE INDEX "idx_rag_embeddings_kb_id" ON "public"."rag_embeddings" USING "btree" ("knowledge_base_id");



CREATE INDEX "idx_rag_embeddings_kb_tier" ON "public"."rag_embeddings" USING "btree" ("knowledge_base_id", "tier");



CREATE INDEX "idx_rag_embeddings_run_id" ON "public"."rag_embeddings" USING "btree" ("run_id");



CREATE INDEX "idx_rag_embeddings_source" ON "public"."rag_embeddings" USING "btree" ("source_type", "source_id");



CREATE INDEX "idx_rag_embeddings_tier" ON "public"."rag_embeddings" USING "btree" ("tier");



CREATE INDEX "idx_rag_embeddings_vector_hnsw" ON "public"."rag_embeddings" USING "hnsw" ("embedding" "extensions"."vector_cosine_ops") WITH ("m"='16', "ef_construction"='64');



CREATE INDEX "idx_rag_facts_category" ON "public"."rag_facts" USING "btree" ("fact_category") WHERE ("fact_category" IS NOT NULL);



CREATE INDEX "idx_rag_facts_doc" ON "public"."rag_facts" USING "btree" ("document_id");



CREATE INDEX "idx_rag_facts_parent" ON "public"."rag_facts" USING "btree" ("parent_fact_id") WHERE ("parent_fact_id" IS NOT NULL);



CREATE INDEX "idx_rag_facts_policy_id" ON "public"."rag_facts" USING "btree" ("policy_id") WHERE ("policy_id" IS NOT NULL);



CREATE INDEX "idx_rag_facts_section" ON "public"."rag_facts" USING "btree" ("section_id");



CREATE INDEX "idx_rag_facts_tsv" ON "public"."rag_facts" USING "gin" ("content_tsv");



CREATE INDEX "idx_rag_facts_user" ON "public"."rag_facts" USING "btree" ("user_id");



CREATE INDEX "idx_rag_kb_user" ON "public"."rag_knowledge_bases" USING "btree" ("user_id");



CREATE INDEX "idx_rag_quality_query" ON "public"."rag_quality_scores" USING "btree" ("query_id");



CREATE INDEX "idx_rag_queries_feedback" ON "public"."rag_queries" USING "btree" ("user_feedback") WHERE ("user_feedback" IS NOT NULL);



CREATE INDEX "idx_rag_queries_kb" ON "public"."rag_queries" USING "btree" ("knowledge_base_id");



CREATE INDEX "idx_rag_queries_user" ON "public"."rag_queries" USING "btree" ("user_id");



CREATE INDEX "idx_rag_questions_doc" ON "public"."rag_expert_questions" USING "btree" ("document_id");



CREATE INDEX "idx_rag_sections_doc" ON "public"."rag_sections" USING "btree" ("document_id");



CREATE INDEX "idx_rag_sections_tsv" ON "public"."rag_sections" USING "gin" ("text_tsv");



CREATE INDEX "idx_rag_sections_user" ON "public"."rag_sections" USING "btree" ("user_id");



CREATE INDEX "idx_rag_test_reports_document" ON "public"."rag_test_reports" USING "btree" ("document_id", "created_at" DESC);



CREATE INDEX "idx_rag_test_reports_user" ON "public"."rag_test_reports" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_scenarios_created_at" ON "public"."scenarios" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_scenarios_created_by" ON "public"."scenarios" USING "btree" ("created_by");



CREATE INDEX "idx_scenarios_generation_status" ON "public"."scenarios" USING "btree" ("generation_status");



CREATE INDEX "idx_scenarios_parameter_values_gin" ON "public"."scenarios" USING "gin" ("parameter_values");



CREATE INDEX "idx_scenarios_parent_template" ON "public"."scenarios" USING "btree" ("parent_template_id");



CREATE INDEX "idx_scenarios_persona" ON "public"."scenarios" USING "btree" ("persona");



CREATE INDEX "idx_scenarios_status" ON "public"."scenarios" USING "btree" ("status");



CREATE INDEX "idx_scenarios_template_status" ON "public"."scenarios" USING "btree" ("parent_template_id", "generation_status");



CREATE INDEX "idx_scenarios_topic" ON "public"."scenarios" USING "btree" ("topic");



CREATE INDEX "idx_schema_migrations_applied" ON "public"."schema_migrations" USING "btree" ("applied_at" DESC);



CREATE INDEX "idx_templates_category" ON "public"."templates" USING "btree" ("category");



CREATE INDEX "idx_templates_created_at" ON "public"."templates" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_templates_created_by" ON "public"."templates" USING "btree" ("created_by");



CREATE INDEX "idx_templates_rating" ON "public"."templates" USING "btree" ("rating" DESC);



CREATE INDEX "idx_templates_usage_count" ON "public"."templates" USING "btree" ("usage_count" DESC);



CREATE INDEX "idx_templates_variables_gin" ON "public"."templates" USING "gin" ("variables");



CREATE INDEX "idx_test_results_created_at" ON "public"."pipeline_test_results" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_test_results_job_id" ON "public"."pipeline_test_results" USING "btree" ("job_id");



CREATE INDEX "idx_test_results_user_id" ON "public"."pipeline_test_results" USING "btree" ("user_id");



CREATE INDEX "idx_training_file_conversations_conversation_id" ON "public"."training_file_conversations" USING "btree" ("conversation_id");



CREATE INDEX "idx_training_file_conversations_file_id" ON "public"."training_file_conversations" USING "btree" ("training_file_id");



CREATE INDEX "idx_training_files_created_at" ON "public"."training_files" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_training_files_created_by" ON "public"."training_files" USING "btree" ("created_by");



CREATE INDEX "idx_training_files_status" ON "public"."training_files" USING "btree" ("status");



CREATE INDEX "idx_training_jobs_dataset_id" ON "public"."training_jobs" USING "btree" ("dataset_id");



CREATE INDEX "idx_training_jobs_status" ON "public"."training_jobs" USING "btree" ("status");



CREATE INDEX "idx_training_jobs_user_id" ON "public"."training_jobs" USING "btree" ("user_id");



CREATE INDEX "idx_training_topics_active" ON "public"."training_topics" USING "btree" ("is_active");



CREATE INDEX "idx_training_topics_category" ON "public"."training_topics" USING "btree" ("category");



CREATE INDEX "idx_training_topics_complexity" ON "public"."training_topics" USING "btree" ("complexity_level");



CREATE INDEX "idx_training_topics_key" ON "public"."training_topics" USING "btree" ("topic_key");



CREATE INDEX "idx_usage_snapshots_table" ON "public"."index_usage_snapshots" USING "btree" ("tablename", "indexname");



CREATE INDEX "idx_usage_snapshots_time" ON "public"."index_usage_snapshots" USING "btree" ("snapshot_timestamp" DESC);



CREATE OR REPLACE TRIGGER "trg_rag_docs_updated" BEFORE UPDATE ON "public"."rag_documents" FOR EACH ROW EXECUTE FUNCTION "public"."update_rag_updated_at"();



CREATE OR REPLACE TRIGGER "trg_rag_facts_updated" BEFORE UPDATE ON "public"."rag_facts" FOR EACH ROW EXECUTE FUNCTION "public"."update_rag_updated_at"();



CREATE OR REPLACE TRIGGER "trg_rag_kb_updated" BEFORE UPDATE ON "public"."rag_knowledge_bases" FOR EACH ROW EXECUTE FUNCTION "public"."update_rag_updated_at"();



CREATE OR REPLACE TRIGGER "trg_rag_questions_updated" BEFORE UPDATE ON "public"."rag_expert_questions" FOR EACH ROW EXECUTE FUNCTION "public"."update_rag_updated_at"();



CREATE OR REPLACE TRIGGER "trg_rag_sections_updated" BEFORE UPDATE ON "public"."rag_sections" FOR EACH ROW EXECUTE FUNCTION "public"."update_rag_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_auto_flag_quality" BEFORE INSERT OR UPDATE ON "public"."conversations" FOR EACH ROW EXECUTE FUNCTION "public"."auto_flag_low_quality"();



CREATE OR REPLACE TRIGGER "trigger_update_templates_last_modified" BEFORE UPDATE ON "public"."templates" FOR EACH ROW EXECUTE FUNCTION "public"."update_templates_last_modified"();



CREATE OR REPLACE TRIGGER "update_batch_jobs_updated_at" BEFORE UPDATE ON "public"."batch_jobs" FOR EACH ROW EXECUTE FUNCTION "public"."update_train_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_conversation_templates_updated_at" BEFORE UPDATE ON "public"."templates" FOR EACH ROW EXECUTE FUNCTION "public"."update_train_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_conversations_updated_at" BEFORE UPDATE ON "public"."conversations" FOR EACH ROW EXECUTE FUNCTION "public"."update_train_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_datasets_updated_at" BEFORE UPDATE ON "public"."datasets" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_documents_updated_at" BEFORE UPDATE ON "public"."documents" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_model_artifacts_updated_at" BEFORE UPDATE ON "public"."model_artifacts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_training_jobs_updated_at" BEFORE UPDATE ON "public"."training_jobs" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_profiles_updated_at" BEFORE UPDATE ON "public"."user_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."_orphaned_records"
    ADD CONSTRAINT "_orphaned_records_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."backup_exports"
    ADD CONSTRAINT "backup_exports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."batch_items"
    ADD CONSTRAINT "batch_items_batch_job_id_fkey" FOREIGN KEY ("batch_job_id") REFERENCES "public"."batch_jobs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."batch_items"
    ADD CONSTRAINT "batch_items_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."batch_jobs"
    ADD CONSTRAINT "batch_jobs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."user_profiles"("id");



ALTER TABLE ONLY "public"."batch_jobs"
    ADD CONSTRAINT "batch_jobs_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."batch_jobs"
    ADD CONSTRAINT "batch_jobs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."templates"
    ADD CONSTRAINT "conversation_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."user_profiles"("id");



ALTER TABLE ONLY "public"."templates"
    ADD CONSTRAINT "conversation_templates_last_modified_by_fkey" FOREIGN KEY ("last_modified_by") REFERENCES "public"."user_profiles"("id");



ALTER TABLE ONLY "public"."conversation_turns"
    ADD CONSTRAINT "conversation_turns_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."multi_turn_conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversation_turns"
    ADD CONSTRAINT "conversation_turns_evaluation_prompt_id_fkey" FOREIGN KEY ("evaluation_prompt_id") REFERENCES "public"."evaluation_prompts"("id");



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "public"."user_profiles"("id");



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."user_profiles"("id");



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."conversations"("id");



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cost_records"
    ADD CONSTRAINT "cost_records_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."training_jobs"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."cost_records"
    ADD CONSTRAINT "cost_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."datasets"
    ADD CONSTRAINT "datasets_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."datasets"
    ADD CONSTRAINT "datasets_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."datasets"
    ADD CONSTRAINT "datasets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."user_profiles"("id");



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."edge_cases"
    ADD CONSTRAINT "edge_cases_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."edge_cases"
    ADD CONSTRAINT "edge_cases_parent_scenario_id_fkey" FOREIGN KEY ("parent_scenario_id") REFERENCES "public"."scenarios"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."error_logs"
    ADD CONSTRAINT "error_logs_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."error_logs"
    ADD CONSTRAINT "error_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."evaluation_prompts"
    ADD CONSTRAINT "evaluation_prompts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."export_logs"
    ADD CONSTRAINT "export_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id");



ALTER TABLE ONLY "public"."failed_generations"
    ADD CONSTRAINT "failed_generations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pipeline_training_metrics"
    ADD CONSTRAINT "fk_pipeline_metrics_job" FOREIGN KEY ("job_id") REFERENCES "public"."pipeline_training_jobs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."training_jobs"
    ADD CONSTRAINT "fk_training_jobs_artifact" FOREIGN KEY ("artifact_id") REFERENCES "public"."model_artifacts"("id");



ALTER TABLE ONLY "public"."generation_logs"
    ADD CONSTRAINT "generation_logs_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("conversation_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."generation_logs"
    ADD CONSTRAINT "generation_logs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."user_profiles"("id");



ALTER TABLE ONLY "public"."generation_logs"
    ADD CONSTRAINT "generation_logs_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id");



ALTER TABLE ONLY "public"."generation_logs"
    ADD CONSTRAINT "generation_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."legacy_conversation_turns"
    ADD CONSTRAINT "legacy_conversation_turns_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."maintenance_operations"
    ADD CONSTRAINT "maintenance_operations_initiated_by_fkey" FOREIGN KEY ("initiated_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."metrics_points"
    ADD CONSTRAINT "metrics_points_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."training_jobs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."model_artifacts"
    ADD CONSTRAINT "model_artifacts_dataset_id_fkey" FOREIGN KEY ("dataset_id") REFERENCES "public"."datasets"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."model_artifacts"
    ADD CONSTRAINT "model_artifacts_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."training_jobs"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."model_artifacts"
    ADD CONSTRAINT "model_artifacts_parent_model_id_fkey" FOREIGN KEY ("parent_model_id") REFERENCES "public"."model_artifacts"("id");



ALTER TABLE ONLY "public"."model_artifacts"
    ADD CONSTRAINT "model_artifacts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."multi_turn_conversations"
    ADD CONSTRAINT "multi_turn_conversations_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."pipeline_training_jobs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."multi_turn_conversations"
    ADD CONSTRAINT "multi_turn_conversations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."performance_alerts"
    ADD CONSTRAINT "performance_alerts_acknowledged_by_fkey" FOREIGN KEY ("acknowledged_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."performance_alerts"
    ADD CONSTRAINT "performance_alerts_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "public"."user_profiles"("id");



ALTER TABLE ONLY "public"."pipeline_evaluation_results"
    ADD CONSTRAINT "pipeline_evaluation_results_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "public"."pipeline_evaluation_runs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pipeline_evaluation_runs"
    ADD CONSTRAINT "pipeline_evaluation_runs_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."pipeline_training_jobs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pipeline_inference_endpoints"
    ADD CONSTRAINT "pipeline_inference_endpoints_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."pipeline_training_jobs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pipeline_inference_endpoints"
    ADD CONSTRAINT "pipeline_inference_endpoints_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pipeline_test_results"
    ADD CONSTRAINT "pipeline_test_results_evaluation_prompt_id_fkey" FOREIGN KEY ("evaluation_prompt_id") REFERENCES "public"."evaluation_prompts"("id");



ALTER TABLE ONLY "public"."pipeline_test_results"
    ADD CONSTRAINT "pipeline_test_results_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."pipeline_training_jobs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pipeline_test_results"
    ADD CONSTRAINT "pipeline_test_results_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pipeline_training_jobs"
    ADD CONSTRAINT "pipeline_training_jobs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."pipeline_training_jobs"
    ADD CONSTRAINT "pipeline_training_jobs_dataset_id_fkey" FOREIGN KEY ("dataset_id") REFERENCES "public"."datasets"("id");



ALTER TABLE ONLY "public"."pipeline_training_jobs"
    ADD CONSTRAINT "pipeline_training_jobs_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."pipeline_training_jobs"
    ADD CONSTRAINT "pipeline_training_jobs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pipeline_training_metrics"
    ADD CONSTRAINT "pipeline_training_metrics_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."pipeline_training_jobs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."query_performance_logs"
    ADD CONSTRAINT "query_performance_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id");



ALTER TABLE ONLY "public"."rag_documents"
    ADD CONSTRAINT "rag_documents_knowledge_base_id_fkey" FOREIGN KEY ("knowledge_base_id") REFERENCES "public"."rag_knowledge_bases"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rag_documents"
    ADD CONSTRAINT "rag_documents_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."rag_embedding_runs"
    ADD CONSTRAINT "rag_embedding_runs_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "public"."rag_documents"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rag_embeddings"
    ADD CONSTRAINT "rag_embeddings_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "public"."rag_documents"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rag_expert_questions"
    ADD CONSTRAINT "rag_expert_questions_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "public"."rag_documents"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rag_facts"
    ADD CONSTRAINT "rag_facts_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "public"."rag_documents"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rag_facts"
    ADD CONSTRAINT "rag_facts_parent_fact_id_fkey" FOREIGN KEY ("parent_fact_id") REFERENCES "public"."rag_facts"("id");



ALTER TABLE ONLY "public"."rag_facts"
    ADD CONSTRAINT "rag_facts_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "public"."rag_sections"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."rag_knowledge_bases"
    ADD CONSTRAINT "rag_knowledge_bases_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."rag_quality_scores"
    ADD CONSTRAINT "rag_quality_scores_query_id_fkey" FOREIGN KEY ("query_id") REFERENCES "public"."rag_queries"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rag_queries"
    ADD CONSTRAINT "rag_queries_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "public"."rag_documents"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."rag_queries"
    ADD CONSTRAINT "rag_queries_knowledge_base_id_fkey" FOREIGN KEY ("knowledge_base_id") REFERENCES "public"."rag_knowledge_bases"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rag_sections"
    ADD CONSTRAINT "rag_sections_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "public"."rag_documents"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."scenarios"
    ADD CONSTRAINT "scenarios_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."scenarios"
    ADD CONSTRAINT "scenarios_parent_template_id_fkey" FOREIGN KEY ("parent_template_id") REFERENCES "public"."templates"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."template_analytics"
    ADD CONSTRAINT "template_analytics_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."training_file_conversations"
    ADD CONSTRAINT "training_file_conversations_added_by_fkey" FOREIGN KEY ("added_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."training_file_conversations"
    ADD CONSTRAINT "training_file_conversations_training_file_id_fkey" FOREIGN KEY ("training_file_id") REFERENCES "public"."training_files"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."training_files"
    ADD CONSTRAINT "training_files_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."training_files"
    ADD CONSTRAINT "training_files_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."training_files"
    ADD CONSTRAINT "training_files_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."training_jobs"
    ADD CONSTRAINT "training_jobs_dataset_id_fkey" FOREIGN KEY ("dataset_id") REFERENCES "public"."datasets"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."training_jobs"
    ADD CONSTRAINT "training_jobs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "All users can view active templates" ON "public"."templates" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Allow authenticated users to acknowledge alerts" ON "public"."performance_alerts" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow authenticated users to create maintenance operations" ON "public"."maintenance_operations" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "initiated_by"));



CREATE POLICY "Allow authenticated users to insert their own failed generation" ON "public"."failed_generations" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "created_by"));



CREATE POLICY "Allow authenticated users to read failed generations" ON "public"."failed_generations" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to view alerts" ON "public"."performance_alerts" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to view maintenance operations" ON "public"."maintenance_operations" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow service role to create alerts" ON "public"."performance_alerts" FOR INSERT TO "service_role" WITH CHECK (true);



CREATE POLICY "Allow service role to insert failed generations" ON "public"."failed_generations" FOR INSERT TO "service_role" WITH CHECK (true);



CREATE POLICY "Allow service role to update maintenance operations" ON "public"."maintenance_operations" FOR UPDATE TO "service_role" USING (true);



CREATE POLICY "Edge cases are viewable by all authenticated users" ON "public"."edge_cases" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Scenarios are viewable by all authenticated users" ON "public"."scenarios" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Service role can manage all batch items" ON "public"."batch_items" USING (true);



CREATE POLICY "Service role can manage evaluation prompts" ON "public"."evaluation_prompts" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role full access embedding runs" ON "public"."rag_embedding_runs" USING (true) WITH CHECK (true);



CREATE POLICY "Service role full access test reports" ON "public"."rag_test_reports" USING (true) WITH CHECK (true);



CREATE POLICY "Service role has full access to evaluation results" ON "public"."pipeline_evaluation_results" USING ((("auth"."jwt"() ->> 'role'::"text") = 'service_role'::"text"));



CREATE POLICY "Service role has full access to evaluation runs" ON "public"."pipeline_evaluation_runs" USING ((("auth"."jwt"() ->> 'role'::"text") = 'service_role'::"text"));



CREATE POLICY "Service role has full access to metrics" ON "public"."pipeline_training_metrics" USING ((("auth"."jwt"() ->> 'role'::"text") = 'service_role'::"text"));



CREATE POLICY "Service role has full access to pipeline jobs" ON "public"."pipeline_training_jobs" USING ((("auth"."jwt"() ->> 'role'::"text") = 'service_role'::"text"));



CREATE POLICY "System can create failed generations" ON "public"."failed_generations" FOR INSERT WITH CHECK (true);



CREATE POLICY "Templates are viewable by all authenticated users" ON "public"."templates" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Users can add conversations to own training files" ON "public"."training_file_conversations" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."training_files"
  WHERE (("training_files"."id" = "training_file_conversations"."training_file_id") AND ("training_files"."created_by" = "auth"."uid"())))));



CREATE POLICY "Users can create legacy conversation turns" ON "public"."legacy_conversation_turns" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."conversations"
  WHERE (("conversations"."id" = "legacy_conversation_turns"."conversation_id") AND ("conversations"."created_by" = "auth"."uid"())))));



CREATE POLICY "Users can create own conversations" ON "public"."conversations" FOR INSERT WITH CHECK (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can create own datasets" ON "public"."datasets" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create own jobs" ON "public"."training_jobs" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create own pipeline jobs" ON "public"."pipeline_training_jobs" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create their own export logs" ON "public"."export_logs" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create training files" ON "public"."training_files" FOR INSERT WITH CHECK (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can delete own conversations" ON "public"."conversations" FOR DELETE USING (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can delete their own conversations" ON "public"."conversations" FOR DELETE USING (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can delete their own edge cases" ON "public"."edge_cases" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can delete their own scenarios" ON "public"."scenarios" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can delete their own templates" ON "public"."templates" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can insert own endpoints" ON "public"."pipeline_inference_endpoints" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own test results" ON "public"."pipeline_test_results" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own conversations" ON "public"."conversations" FOR INSERT WITH CHECK (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can insert their own edge cases" ON "public"."edge_cases" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can insert their own generation logs" ON "public"."generation_logs" FOR INSERT WITH CHECK (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can insert their own scenarios" ON "public"."scenarios" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can insert their own templates" ON "public"."templates" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can manage own conversations" ON "public"."multi_turn_conversations" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage their own batch jobs" ON "public"."batch_jobs" USING (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can manage their own templates" ON "public"."templates" USING (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can manage turns of own conversations" ON "public"."conversation_turns" USING (("conversation_id" IN ( SELECT "multi_turn_conversations"."id"
   FROM "public"."multi_turn_conversations"
  WHERE ("multi_turn_conversations"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can read active evaluation prompts" ON "public"."evaluation_prompts" FOR SELECT TO "authenticated" USING (("is_active" = true));



CREATE POLICY "Users can update documents" ON "public"."documents" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Users can update own conversations" ON "public"."conversations" FOR UPDATE USING (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can update own datasets" ON "public"."datasets" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own endpoints" ON "public"."pipeline_inference_endpoints" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own export logs" ON "public"."export_logs" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own pipeline jobs" ON "public"."pipeline_training_jobs" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own test results" ON "public"."pipeline_test_results" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own training files" ON "public"."training_files" FOR UPDATE USING (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can update their own conversations" ON "public"."conversations" FOR UPDATE USING (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can update their own edge cases" ON "public"."edge_cases" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can update their own profile" ON "public"."user_profiles" FOR UPDATE USING ((("auth"."uid"())::"text" = ("id")::"text"));



CREATE POLICY "Users can update their own profile via auth" ON "public"."user_profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can update their own scenarios" ON "public"."scenarios" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can update their own templates" ON "public"."templates" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can view documents" ON "public"."documents" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Users can view evaluation runs for own jobs" ON "public"."pipeline_evaluation_runs" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."pipeline_training_jobs"
  WHERE (("pipeline_training_jobs"."id" = "pipeline_evaluation_runs"."job_id") AND ("pipeline_training_jobs"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view legacy conversation turns" ON "public"."legacy_conversation_turns" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."conversations"
  WHERE (("conversations"."id" = "legacy_conversation_turns"."conversation_id") AND ("conversations"."created_by" = "auth"."uid"())))));



CREATE POLICY "Users can view metrics for own jobs" ON "public"."pipeline_training_metrics" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."pipeline_training_jobs"
  WHERE (("pipeline_training_jobs"."id" = "pipeline_training_metrics"."job_id") AND ("pipeline_training_jobs"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view own conversations" ON "public"."conversations" FOR SELECT USING (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can view own datasets" ON "public"."datasets" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own embedding runs" ON "public"."rag_embedding_runs" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own endpoints" ON "public"."pipeline_inference_endpoints" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own failed generations" ON "public"."failed_generations" FOR SELECT USING (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can view own jobs" ON "public"."training_jobs" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own models" ON "public"."model_artifacts" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own pipeline jobs" ON "public"."pipeline_training_jobs" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own test reports" ON "public"."rag_test_reports" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own test results" ON "public"."pipeline_test_results" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view results for own evaluation runs" ON "public"."pipeline_evaluation_results" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."pipeline_evaluation_runs"
     JOIN "public"."pipeline_training_jobs" ON (("pipeline_training_jobs"."id" = "pipeline_evaluation_runs"."job_id")))
  WHERE (("pipeline_evaluation_runs"."id" = "pipeline_evaluation_results"."run_id") AND ("pipeline_training_jobs"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view their own batch items" ON "public"."batch_items" FOR SELECT USING (("batch_job_id" IN ( SELECT "batch_jobs"."id"
   FROM "public"."batch_jobs"
  WHERE ("batch_jobs"."created_by" = "auth"."uid"()))));



CREATE POLICY "Users can view their own batch jobs" ON "public"."batch_jobs" FOR SELECT USING (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can view their own conversations" ON "public"."conversations" FOR SELECT USING (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can view their own export logs" ON "public"."export_logs" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own generation logs" ON "public"."generation_logs" FOR SELECT USING (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can view their own profile" ON "public"."user_profiles" FOR SELECT USING ((("auth"."uid"())::"text" = ("id")::"text"));



CREATE POLICY "Users can view their own profile via auth" ON "public"."user_profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view training file conversations" ON "public"."training_file_conversations" FOR SELECT USING (true);



CREATE POLICY "Users can view training files" ON "public"."training_files" FOR SELECT USING (true);



ALTER TABLE "public"."batch_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."batch_jobs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."conversation_turns" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."conversations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cost_records" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "cost_records_select_own" ON "public"."cost_records" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "cost_records_service_all" ON "public"."cost_records" USING (("auth"."role"() = 'service_role'::"text"));



ALTER TABLE "public"."datasets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."edge_cases" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."evaluation_prompts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."export_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."failed_generations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."generation_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."legacy_conversation_turns" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."maintenance_operations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."metrics_points" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "metrics_points_select_via_job" ON "public"."metrics_points" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."pipeline_training_jobs"
  WHERE (("pipeline_training_jobs"."id" = "metrics_points"."job_id") AND ("pipeline_training_jobs"."user_id" = "auth"."uid"())))));



CREATE POLICY "metrics_points_service_all" ON "public"."metrics_points" USING (("auth"."role"() = 'service_role'::"text"));



ALTER TABLE "public"."model_artifacts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."multi_turn_conversations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "notifications_delete_own" ON "public"."notifications" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "notifications_insert_service" ON "public"."notifications" FOR INSERT WITH CHECK (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "notifications_select_own" ON "public"."notifications" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "notifications_service_all" ON "public"."notifications" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "notifications_update_own" ON "public"."notifications" FOR UPDATE USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."performance_alerts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pipeline_evaluation_results" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pipeline_evaluation_runs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pipeline_inference_endpoints" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pipeline_test_results" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pipeline_training_jobs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pipeline_training_metrics" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."rag_documents" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "rag_documents_delete_own" ON "public"."rag_documents" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "rag_documents_insert_own" ON "public"."rag_documents" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "rag_documents_select_own" ON "public"."rag_documents" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "rag_documents_update_own" ON "public"."rag_documents" FOR UPDATE USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."rag_embedding_runs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."rag_embeddings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "rag_embeddings_delete_own" ON "public"."rag_embeddings" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "rag_embeddings_insert_own" ON "public"."rag_embeddings" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "rag_embeddings_select_own" ON "public"."rag_embeddings" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "rag_embeddings_update_own" ON "public"."rag_embeddings" FOR UPDATE USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."rag_expert_questions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "rag_expert_questions_delete_own" ON "public"."rag_expert_questions" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "rag_expert_questions_insert_own" ON "public"."rag_expert_questions" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "rag_expert_questions_select_own" ON "public"."rag_expert_questions" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "rag_expert_questions_update_own" ON "public"."rag_expert_questions" FOR UPDATE USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."rag_facts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "rag_facts_delete_own" ON "public"."rag_facts" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "rag_facts_insert_own" ON "public"."rag_facts" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "rag_facts_select_own" ON "public"."rag_facts" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "rag_facts_update_own" ON "public"."rag_facts" FOR UPDATE USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."rag_knowledge_bases" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "rag_knowledge_bases_delete_own" ON "public"."rag_knowledge_bases" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "rag_knowledge_bases_insert_own" ON "public"."rag_knowledge_bases" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "rag_knowledge_bases_select_own" ON "public"."rag_knowledge_bases" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "rag_knowledge_bases_update_own" ON "public"."rag_knowledge_bases" FOR UPDATE USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."rag_quality_scores" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "rag_quality_scores_delete_own" ON "public"."rag_quality_scores" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "rag_quality_scores_insert_own" ON "public"."rag_quality_scores" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "rag_quality_scores_select_own" ON "public"."rag_quality_scores" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "rag_quality_scores_update_own" ON "public"."rag_quality_scores" FOR UPDATE USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."rag_queries" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "rag_queries_delete_own" ON "public"."rag_queries" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "rag_queries_insert_own" ON "public"."rag_queries" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "rag_queries_select_own" ON "public"."rag_queries" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "rag_queries_update_own" ON "public"."rag_queries" FOR UPDATE USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."rag_sections" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "rag_sections_delete_own" ON "public"."rag_sections" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "rag_sections_insert_own" ON "public"."rag_sections" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "rag_sections_select_own" ON "public"."rag_sections" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "rag_sections_update_own" ON "public"."rag_sections" FOR UPDATE USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."rag_test_reports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."scenarios" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."training_file_conversations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."training_files" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."training_jobs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_profiles" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";





GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



















































GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "service_role";























































































































































































































































































































































































































































































GRANT ALL ON FUNCTION "public"."auto_flag_low_quality"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_flag_low_quality"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_flag_low_quality"() TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_quality_score"("p_turn_count" integer, "p_total_tokens" integer, "p_quality_metrics" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_quality_score"("p_turn_count" integer, "p_total_tokens" integer, "p_quality_metrics" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_quality_score"("p_turn_count" integer, "p_total_tokens" integer, "p_quality_metrics" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."capture_index_usage_snapshot"() TO "anon";
GRANT ALL ON FUNCTION "public"."capture_index_usage_snapshot"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."capture_index_usage_snapshot"() TO "service_role";



GRANT ALL ON FUNCTION "public"."capture_table_bloat_snapshot"() TO "anon";
GRANT ALL ON FUNCTION "public"."capture_table_bloat_snapshot"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."capture_table_bloat_snapshot"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_table_bloat_alerts"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_table_bloat_alerts"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_table_bloat_alerts"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_expired_backups"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_expired_backups"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_expired_backups"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_old_error_logs"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_old_error_logs"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_old_error_logs"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_performance_alert"("p_alert_type" "text", "p_severity" "text", "p_message" "text", "p_details" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."create_performance_alert"("p_alert_type" "text", "p_severity" "text", "p_message" "text", "p_details" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_performance_alert"("p_alert_type" "text", "p_severity" "text", "p_message" "text", "p_details" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."detect_unused_indexes"("age_days" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."detect_unused_indexes"("age_days" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."detect_unused_indexes"("age_days" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."exec_sql"("sql_script" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."exec_sql"("sql_script" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."exec_sql"("sql_script" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."execute_analyze"("p_table_name" "text", "p_verbose" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."execute_analyze"("p_table_name" "text", "p_verbose" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."execute_analyze"("p_table_name" "text", "p_verbose" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."execute_reindex"("p_table_name" "text", "p_index_name" "text", "p_concurrent" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."execute_reindex"("p_table_name" "text", "p_index_name" "text", "p_concurrent" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."execute_reindex"("p_table_name" "text", "p_index_name" "text", "p_concurrent" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."execute_vacuum"("p_table_name" "text", "p_full" boolean, "p_analyze" boolean, "p_verbose" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."execute_vacuum"("p_table_name" "text", "p_full" boolean, "p_analyze" boolean, "p_verbose" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."execute_vacuum"("p_table_name" "text", "p_full" boolean, "p_analyze" boolean, "p_verbose" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_connection_pool_metrics"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_connection_pool_metrics"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_connection_pool_metrics"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_conversations_by_chunk"("chunk_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_conversations_by_chunk"("chunk_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_conversations_by_chunk"("chunk_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_conversations_by_chunk"("target_chunk_id" "uuid", "include_metadata" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."get_conversations_by_chunk"("target_chunk_id" "uuid", "include_metadata" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_conversations_by_chunk"("target_chunk_id" "uuid", "include_metadata" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_database_overview"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_database_overview"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_database_overview"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_export_logs_schema"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_export_logs_schema"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_export_logs_schema"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_index_health_metrics"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_index_health_metrics"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_index_health_metrics"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_scenario_edge_case_count"("scenario_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_scenario_edge_case_count"("scenario_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_scenario_edge_case_count"("scenario_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_slow_queries"("hours_back" integer, "min_duration_ms" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_slow_queries"("hours_back" integer, "min_duration_ms" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_slow_queries"("hours_back" integer, "min_duration_ms" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_table_health_metrics"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_table_health_metrics"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_table_health_metrics"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_template_scenario_count"("template_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_template_scenario_count"("template_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_template_scenario_count"("template_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_arc_usage"("arc_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_arc_usage"("arc_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_arc_usage"("arc_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_custom_tag_usage"("tag_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_custom_tag_usage"("tag_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_custom_tag_usage"("tag_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_kb_doc_count"("kb_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_kb_doc_count"("kb_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_kb_doc_count"("kb_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_persona_usage"("persona_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_persona_usage"("persona_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_persona_usage"("persona_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_topic_usage"("topic_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_topic_usage"("topic_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_topic_usage"("topic_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."index_exists"("p_index_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."index_exists"("p_index_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."index_exists"("p_index_name" "text") TO "service_role";












GRANT ALL ON FUNCTION "public"."migrate_workflow_session_to_normalized"("session_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."migrate_workflow_session_to_normalized"("session_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."migrate_workflow_session_to_normalized"("session_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."reindex_if_bloated"("table_name" "text", "bloat_threshold" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."reindex_if_bloated"("table_name" "text", "bloat_threshold" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."reindex_if_bloated"("table_name" "text", "bloat_threshold" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."safe_delete_scenario"("scenario_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."safe_delete_scenario"("scenario_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."safe_delete_scenario"("scenario_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."safe_delete_template"("template_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."safe_delete_template"("template_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."safe_delete_template"("template_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."search_rag_text"("search_query" "text", "filter_knowledge_base_id" "uuid", "filter_document_id" "uuid", "match_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."search_rag_text"("search_query" "text", "filter_knowledge_base_id" "uuid", "filter_document_id" "uuid", "match_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_rag_text"("search_query" "text", "filter_knowledge_base_id" "uuid", "filter_document_id" "uuid", "match_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."search_rag_text"("search_query" "text", "filter_knowledge_base_id" "uuid", "filter_document_id" "uuid", "filter_run_id" "uuid", "match_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."search_rag_text"("search_query" "text", "filter_knowledge_base_id" "uuid", "filter_document_id" "uuid", "filter_run_id" "uuid", "match_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_rag_text"("search_query" "text", "filter_knowledge_base_id" "uuid", "filter_document_id" "uuid", "filter_run_id" "uuid", "match_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "postgres";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "anon";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "service_role";



GRANT ALL ON FUNCTION "public"."show_limit"() TO "postgres";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "anon";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "service_role";



GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "postgres";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "anon";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."table_exists"("p_table_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."table_exists"("p_table_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."table_exists"("p_table_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_rag_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_rag_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_rag_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_templates_last_modified"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_templates_last_modified"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_templates_last_modified"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_train_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_train_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_train_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."vacuum_analyze_table"("table_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."vacuum_analyze_table"("table_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vacuum_analyze_table"("table_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_document_categorization"("doc_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."validate_document_categorization"("doc_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_document_categorization"("doc_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."weekly_maintenance"() TO "anon";
GRANT ALL ON FUNCTION "public"."weekly_maintenance"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."weekly_maintenance"() TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "service_role";




































GRANT ALL ON TABLE "public"."_orphaned_records" TO "anon";
GRANT ALL ON TABLE "public"."_orphaned_records" TO "authenticated";
GRANT ALL ON TABLE "public"."_orphaned_records" TO "service_role";



GRANT ALL ON TABLE "public"."api_response_logs" TO "anon";
GRANT ALL ON TABLE "public"."api_response_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."api_response_logs" TO "service_role";



GRANT ALL ON TABLE "public"."backup_exports" TO "anon";
GRANT ALL ON TABLE "public"."backup_exports" TO "authenticated";
GRANT ALL ON TABLE "public"."backup_exports" TO "service_role";



GRANT ALL ON TABLE "public"."batch_checkpoints" TO "anon";
GRANT ALL ON TABLE "public"."batch_checkpoints" TO "authenticated";
GRANT ALL ON TABLE "public"."batch_checkpoints" TO "service_role";



GRANT ALL ON TABLE "public"."batch_items" TO "anon";
GRANT ALL ON TABLE "public"."batch_items" TO "authenticated";
GRANT ALL ON TABLE "public"."batch_items" TO "service_role";



GRANT ALL ON TABLE "public"."batch_jobs" TO "anon";
GRANT ALL ON TABLE "public"."batch_jobs" TO "authenticated";
GRANT ALL ON TABLE "public"."batch_jobs" TO "service_role";



GRANT ALL ON TABLE "public"."conversation_turns" TO "anon";
GRANT ALL ON TABLE "public"."conversation_turns" TO "authenticated";
GRANT ALL ON TABLE "public"."conversation_turns" TO "service_role";



GRANT ALL ON TABLE "public"."conversations" TO "anon";
GRANT ALL ON TABLE "public"."conversations" TO "authenticated";
GRANT ALL ON TABLE "public"."conversations" TO "service_role";



GRANT ALL ON TABLE "public"."cost_records" TO "anon";
GRANT ALL ON TABLE "public"."cost_records" TO "authenticated";
GRANT ALL ON TABLE "public"."cost_records" TO "service_role";



GRANT ALL ON TABLE "public"."datasets" TO "anon";
GRANT ALL ON TABLE "public"."datasets" TO "authenticated";
GRANT ALL ON TABLE "public"."datasets" TO "service_role";



GRANT ALL ON TABLE "public"."documents" TO "anon";
GRANT ALL ON TABLE "public"."documents" TO "authenticated";
GRANT ALL ON TABLE "public"."documents" TO "service_role";



GRANT ALL ON TABLE "public"."edge_cases" TO "anon";
GRANT ALL ON TABLE "public"."edge_cases" TO "authenticated";
GRANT ALL ON TABLE "public"."edge_cases" TO "service_role";



GRANT ALL ON TABLE "public"."emotional_arcs" TO "anon";
GRANT ALL ON TABLE "public"."emotional_arcs" TO "authenticated";
GRANT ALL ON TABLE "public"."emotional_arcs" TO "service_role";



GRANT ALL ON TABLE "public"."error_logs" TO "anon";
GRANT ALL ON TABLE "public"."error_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."error_logs" TO "service_role";



GRANT ALL ON TABLE "public"."evaluation_prompts" TO "anon";
GRANT ALL ON TABLE "public"."evaluation_prompts" TO "authenticated";
GRANT ALL ON TABLE "public"."evaluation_prompts" TO "service_role";



GRANT ALL ON TABLE "public"."export_logs" TO "anon";
GRANT ALL ON TABLE "public"."export_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."export_logs" TO "service_role";



GRANT ALL ON TABLE "public"."failed_generations" TO "anon";
GRANT ALL ON TABLE "public"."failed_generations" TO "authenticated";
GRANT ALL ON TABLE "public"."failed_generations" TO "service_role";



GRANT ALL ON TABLE "public"."generation_logs" TO "anon";
GRANT ALL ON TABLE "public"."generation_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."generation_logs" TO "service_role";



GRANT ALL ON TABLE "public"."index_usage_snapshots" TO "anon";
GRANT ALL ON TABLE "public"."index_usage_snapshots" TO "authenticated";
GRANT ALL ON TABLE "public"."index_usage_snapshots" TO "service_role";



GRANT ALL ON TABLE "public"."legacy_conversation_turns" TO "anon";
GRANT ALL ON TABLE "public"."legacy_conversation_turns" TO "authenticated";
GRANT ALL ON TABLE "public"."legacy_conversation_turns" TO "service_role";



GRANT ALL ON TABLE "public"."maintenance_operations" TO "anon";
GRANT ALL ON TABLE "public"."maintenance_operations" TO "authenticated";
GRANT ALL ON TABLE "public"."maintenance_operations" TO "service_role";



GRANT ALL ON TABLE "public"."metrics_points" TO "anon";
GRANT ALL ON TABLE "public"."metrics_points" TO "authenticated";
GRANT ALL ON TABLE "public"."metrics_points" TO "service_role";



GRANT ALL ON TABLE "public"."model_artifacts" TO "anon";
GRANT ALL ON TABLE "public"."model_artifacts" TO "authenticated";
GRANT ALL ON TABLE "public"."model_artifacts" TO "service_role";



GRANT ALL ON TABLE "public"."multi_turn_conversations" TO "anon";
GRANT ALL ON TABLE "public"."multi_turn_conversations" TO "authenticated";
GRANT ALL ON TABLE "public"."multi_turn_conversations" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."performance_alerts" TO "anon";
GRANT ALL ON TABLE "public"."performance_alerts" TO "authenticated";
GRANT ALL ON TABLE "public"."performance_alerts" TO "service_role";



GRANT ALL ON TABLE "public"."personas" TO "anon";
GRANT ALL ON TABLE "public"."personas" TO "authenticated";
GRANT ALL ON TABLE "public"."personas" TO "service_role";



GRANT ALL ON TABLE "public"."pipeline_base_models" TO "anon";
GRANT ALL ON TABLE "public"."pipeline_base_models" TO "authenticated";
GRANT ALL ON TABLE "public"."pipeline_base_models" TO "service_role";



GRANT ALL ON TABLE "public"."pipeline_evaluation_results" TO "anon";
GRANT ALL ON TABLE "public"."pipeline_evaluation_results" TO "authenticated";
GRANT ALL ON TABLE "public"."pipeline_evaluation_results" TO "service_role";



GRANT ALL ON TABLE "public"."pipeline_evaluation_runs" TO "anon";
GRANT ALL ON TABLE "public"."pipeline_evaluation_runs" TO "authenticated";
GRANT ALL ON TABLE "public"."pipeline_evaluation_runs" TO "service_role";



GRANT ALL ON TABLE "public"."pipeline_inference_endpoints" TO "anon";
GRANT ALL ON TABLE "public"."pipeline_inference_endpoints" TO "authenticated";
GRANT ALL ON TABLE "public"."pipeline_inference_endpoints" TO "service_role";



GRANT ALL ON TABLE "public"."pipeline_test_results" TO "anon";
GRANT ALL ON TABLE "public"."pipeline_test_results" TO "authenticated";
GRANT ALL ON TABLE "public"."pipeline_test_results" TO "service_role";



GRANT ALL ON TABLE "public"."pipeline_training_jobs" TO "anon";
GRANT ALL ON TABLE "public"."pipeline_training_jobs" TO "authenticated";
GRANT ALL ON TABLE "public"."pipeline_training_jobs" TO "service_role";



GRANT ALL ON TABLE "public"."pipeline_training_metrics" TO "anon";
GRANT ALL ON TABLE "public"."pipeline_training_metrics" TO "authenticated";
GRANT ALL ON TABLE "public"."pipeline_training_metrics" TO "service_role";



GRANT ALL ON TABLE "public"."prompt_templates" TO "anon";
GRANT ALL ON TABLE "public"."prompt_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."prompt_templates" TO "service_role";



GRANT ALL ON TABLE "public"."query_performance_logs" TO "anon";
GRANT ALL ON TABLE "public"."query_performance_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."query_performance_logs" TO "service_role";



GRANT ALL ON TABLE "public"."rag_documents" TO "anon";
GRANT ALL ON TABLE "public"."rag_documents" TO "authenticated";
GRANT ALL ON TABLE "public"."rag_documents" TO "service_role";



GRANT ALL ON TABLE "public"."rag_embedding_runs" TO "anon";
GRANT ALL ON TABLE "public"."rag_embedding_runs" TO "authenticated";
GRANT ALL ON TABLE "public"."rag_embedding_runs" TO "service_role";



GRANT ALL ON TABLE "public"."rag_embeddings" TO "anon";
GRANT ALL ON TABLE "public"."rag_embeddings" TO "authenticated";
GRANT ALL ON TABLE "public"."rag_embeddings" TO "service_role";



GRANT ALL ON TABLE "public"."rag_expert_questions" TO "anon";
GRANT ALL ON TABLE "public"."rag_expert_questions" TO "authenticated";
GRANT ALL ON TABLE "public"."rag_expert_questions" TO "service_role";



GRANT ALL ON TABLE "public"."rag_facts" TO "anon";
GRANT ALL ON TABLE "public"."rag_facts" TO "authenticated";
GRANT ALL ON TABLE "public"."rag_facts" TO "service_role";



GRANT ALL ON TABLE "public"."rag_knowledge_bases" TO "anon";
GRANT ALL ON TABLE "public"."rag_knowledge_bases" TO "authenticated";
GRANT ALL ON TABLE "public"."rag_knowledge_bases" TO "service_role";



GRANT ALL ON TABLE "public"."rag_quality_scores" TO "anon";
GRANT ALL ON TABLE "public"."rag_quality_scores" TO "authenticated";
GRANT ALL ON TABLE "public"."rag_quality_scores" TO "service_role";



GRANT ALL ON TABLE "public"."rag_queries" TO "anon";
GRANT ALL ON TABLE "public"."rag_queries" TO "authenticated";
GRANT ALL ON TABLE "public"."rag_queries" TO "service_role";



GRANT ALL ON TABLE "public"."rag_sections" TO "anon";
GRANT ALL ON TABLE "public"."rag_sections" TO "authenticated";
GRANT ALL ON TABLE "public"."rag_sections" TO "service_role";



GRANT ALL ON TABLE "public"."rag_test_reports" TO "anon";
GRANT ALL ON TABLE "public"."rag_test_reports" TO "authenticated";
GRANT ALL ON TABLE "public"."rag_test_reports" TO "service_role";



GRANT ALL ON TABLE "public"."scenarios" TO "anon";
GRANT ALL ON TABLE "public"."scenarios" TO "authenticated";
GRANT ALL ON TABLE "public"."scenarios" TO "service_role";



GRANT ALL ON TABLE "public"."schema_migrations" TO "anon";
GRANT ALL ON TABLE "public"."schema_migrations" TO "authenticated";
GRANT ALL ON TABLE "public"."schema_migrations" TO "service_role";



GRANT ALL ON TABLE "public"."table_bloat_snapshots" TO "anon";
GRANT ALL ON TABLE "public"."table_bloat_snapshots" TO "authenticated";
GRANT ALL ON TABLE "public"."table_bloat_snapshots" TO "service_role";



GRANT ALL ON TABLE "public"."template_analytics" TO "anon";
GRANT ALL ON TABLE "public"."template_analytics" TO "authenticated";
GRANT ALL ON TABLE "public"."template_analytics" TO "service_role";



GRANT ALL ON TABLE "public"."templates" TO "anon";
GRANT ALL ON TABLE "public"."templates" TO "authenticated";
GRANT ALL ON TABLE "public"."templates" TO "service_role";



GRANT ALL ON TABLE "public"."training_file_conversations" TO "anon";
GRANT ALL ON TABLE "public"."training_file_conversations" TO "authenticated";
GRANT ALL ON TABLE "public"."training_file_conversations" TO "service_role";



GRANT ALL ON TABLE "public"."training_files" TO "anon";
GRANT ALL ON TABLE "public"."training_files" TO "authenticated";
GRANT ALL ON TABLE "public"."training_files" TO "service_role";



GRANT ALL ON TABLE "public"."training_jobs" TO "anon";
GRANT ALL ON TABLE "public"."training_jobs" TO "authenticated";
GRANT ALL ON TABLE "public"."training_jobs" TO "service_role";



GRANT ALL ON TABLE "public"."training_topics" TO "anon";
GRANT ALL ON TABLE "public"."training_topics" TO "authenticated";
GRANT ALL ON TABLE "public"."training_topics" TO "service_role";



GRANT ALL ON TABLE "public"."user_profiles" TO "anon";
GRANT ALL ON TABLE "public"."user_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_profiles" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






























