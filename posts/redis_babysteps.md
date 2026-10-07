---
title: Understanding Redis
date: 2026-08-13
---

Most of the time when people describe Redis, they say "it's a fast key-value store" and leave it there. That's true, but it undersells what makes it useful. The interesting part isn't that Redis is fast — plenty of things are fast — it's that it gives you a small set of data structures that map cleanly onto real problems, and it gets out of your way while you use them.

This is a first pass at organizing my own notes on it — how it actually works, where it fits, and where it doesn't.

## The core idea

Redis keeps everything in memory, which is the whole reason it's fast: no disk seeks, no query planner, just a hash table sitting in RAM with a network interface in front of it. The tradeoff is the one you'd expect — memory is more expensive and less durable than disk — so Redis isn't trying to replace your primary database. It's trying to sit next to it, handling the subset of reads and writes that need to happen in microseconds instead of milliseconds.

What makes it more than a cache, though, is that "value" doesn't just mean a blob of bytes. Redis gives you real data structures, each with commands designed around how that structure actually gets used:

- **Strings** — the simplest case: a key and a value. Used for caching a rendered page, storing a session token, or as a counter (`INCR`, `DECR`).
- **Hashes** — a key pointing to a set of field-value pairs. Good for representing an object (a user profile, a config blob) without serializing and deserializing it on every access.
- **Lists** — ordered, push/pop from either end. A natural fit for queues or recent-activity feeds.
- **Sets** — unordered, unique members. Useful for things like "has this user already seen this notification" or tag membership.
- **Sorted sets** — sets with a score attached to each member, kept in order. This is the structure behind most leaderboards and rate-limit windows, because "give me the top 10" or "give me everything in the last 60 seconds" is a single command instead of a scan.

Picking the right structure for the problem is most of what using Redis well actually looks like.

## Is it durable, or not?

The in-memory part makes people assume Redis is inherently ephemeral, but it doesn't have to be. There are two persistence mechanisms, and they trade off differently:

- **RDB (snapshotting)** — periodic point-in-time dumps of the whole dataset to disk. Cheap, compact, but you can lose whatever changed since the last snapshot if the process dies.
- **AOF (append-only file)** — logs every write operation as it happens, replayed on restart to rebuild state. Much better durability guarantees, at the cost of a larger file and slightly more write overhead.

You can run both together, or neither, depending on whether losing a few seconds of data on a crash is actually a problem for what you're storing. For a cache, usually not. For something like a job queue, probably yes.

## Where it actually earns its place

The pattern I keep coming back to is: **use Redis for state that's small, short-lived, or read far more often than it's written.**

- **Caching** — the obvious one. Cache-aside is the common pattern: check Redis first, fall through to the real database on a miss, write the result back with a TTL.
- **Session storage** — sessions are a good fit because they're small, keyed by a single ID, and don't need the durability guarantees of a relational table.
- **Rate limiting** — `INCR` a key on each request, set a TTL on first write, reject once the counter crosses a threshold. The whole thing is a couple of commands and no cron job to clean up stale entries.
- **Pub/sub** — lightweight message broadcasting when you don't need the durability or replay guarantees of something like Kafka.

## A concrete example: visit tracking on this site


I'm using a small Redis-backed endpoint on this site to track page visits — each request bumps a counter with `INCR`, and the current count gets read back out whenever the page renders. It's a good miniature example of why Redis fits this kind of problem so well: a page-view counter doesn't need the durability guarantees or query flexibility of a real database, it just needs to survive being hit a lot and answer instantly. A single atomic increment is the whole implementation.

## What I'm still working through

This covers the shape of it, but the parts I want to go deeper on next are eviction policies (what actually happens when Redis runs out of memory), clustering and how keys get sharded across nodes, and where Redis Streams fit relative to a proper message queue. Notes on those to come.