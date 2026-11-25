---
title: 'Bill of Materials'
description: 'From design requirements to specific hardware — sourced from the Polish used market, validated one node at a time.'
date: 2026-03-28
tags: ['homelab', 'okd', 'kubernetes', 'infrastructure', 'hardware']
authors: ['vd']
---


The [design posts](/blog/homelab-design) defined what the cluster needs. This is where requirements become specific hardware — but not all at once. Buy one, test it, then buy the rest.

:::note[Market context]
Everything here was sourced from the Polish used/refurbished market, primarily Allegro.pl.
:::

The BOM is split into two stages:

:::note[BOM stages]
1. **Pre-Validation** — One node and the full network infrastructure. Chassis, NIC, boot SSD, router, switch, cabling. Enough to prove the design works before committing to three or five nodes.
2. **Post-SNO** — Final hardware after OKD Single Node validation. Additional nodes, enterprise NVMe, HDDs, and any swaps based on lessons learned.
:::

Start with the pre-validation BOM to see what was sourced and why.
