/**
 * This is a Lua script for atomically adding a message with metadata updates and storage limits.
 *
 * This script is critical for the `addMessage` operation because it performs multiple
 * interdependent operations that must be atomic:
 *
 * 1. **Message Storage**: Adds the message to a Redis list using LPUSH (newest first)
 * 2. **Storage Limiting**: Applies configurable storage limits using LTRIM to prevent unbounded growth
 * 3. **Metadata Tracking**: Updates conversation metadata including:
 *    - Message count (for pagination and analytics)
 *    - Running average compression ratio (for storage optimization insights)
 *    - Total storage size in bytes (for quota management)
 *    - Last updated timestamp (for cache invalidation)
 * 4. **TTL Management**: Applies time-to-live settings for data retention policies
 *
 * **Why this Lua Script is Required:**
 *
 * Without this script, the operation would require 4-6 separate Redis commands:
 * - LPUSH (add message)
 * - LTRIM (apply limit)
 * - HGET x2 (get current metadata)
 * - HSET (update metadata)
 * - HINCRBY (increment counters)
 * - EXPIRE x2 (set TTLs)
 *
 * This would create race conditions where:
 * - Another process could add messages between LPUSH and LTRIM, causing incorrect limiting
 * - Metadata could become inconsistent if some operations fail
 * - Running averages could be calculated incorrectly due to concurrent updates
 *
 * **Performance Impact:**
 * - Reduces 6+ network round-trips to 1
 * - Eliminates race conditions in high-concurrency scenarios
 * - Ensures metadata consistency for analytics and storage management
 *
 * @param keys - [msg_key, meta_key] - Redis keys for message list and metadata hash
 * @param argv - [message, limit, timestamp, message_size, compression_ratio, ttl] - Operation parameters
 * @returns Number of messages in the list after the operation
 */
export const ADD_MESSAGE_SCRIPT = `
  local msg_key = KEYS[1]
  local meta_key = KEYS[2]
  local message = ARGV[1]
  local limit = tonumber(ARGV[2])
  local timestamp = ARGV[3]
  local message_size = tonumber(ARGV[4])
  local compression_ratio = tonumber(ARGV[5])
  local ttl = tonumber(ARGV[6])
  
  -- Add message to the front of the list (newest first)
  redis.call('LPUSH', msg_key, message)
  
  -- Apply storage limit to prevent unbounded growth
  if limit > 0 then
      redis.call('LTRIM', msg_key, 0, limit - 1)
  end
  
  -- Get current metadata for running averages calculation
  local current_count = redis.call('HGET', meta_key, 'message_count') or '0'
  local current_ratio = redis.call('HGET', meta_key, 'avg_compression_ratio') or '1.0'
  local new_count = tonumber(current_count) + 1
  
  -- Calculate running average compression ratio for storage optimization insights
  local new_avg_ratio = ((tonumber(current_ratio) * tonumber(current_count)) + compression_ratio) / new_count
  
  -- Update metadata atomically
  redis.call('HSET', meta_key,
    'updated_at', timestamp,
    'message_count', new_count,
    'avg_compression_ratio', new_avg_ratio
  )
  redis.call('HINCRBY', meta_key, 'total_size_bytes', message_size)
  
  -- Apply TTL for data retention policies
  if ttl > 0 then
      redis.call('EXPIRE', msg_key, ttl)
      redis.call('EXPIRE', meta_key, ttl)
  end
  
  -- Return current message count for client feedback
  return redis.call('LLEN', msg_key)
`;
