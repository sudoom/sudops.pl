---
title: 'Pre-Validation BOM: One Node and the Network'
description: 'Validation BOM for a bare-metal OKD homelab — Dell OptiPlex 5090 SFF, Intel X710-DA2, MikroTik networking, and why you buy one node before committing to five.'
date: 2026-03-28
tags: ['homelab', 'okd', 'kubernetes', 'infrastructure', 'hardware']
authors: ['vd']
order: 1
---

import Callout from '@/components/Callout.astro'

The design posts defined what the cluster needs. This post is where requirements become specific hardware — but not all of it. This is the validation BOM: one node to prove the design works before committing to three or five.

The final BOM — with HDD models, enterprise NVMe, and complete pricing for all nodes — comes after validation. Buy one, test it, then buy the rest.

<Callout title="Market context" variant="note">
  Everything here was sourced from the Polish used/refurbished market, primarily Allegro.pl.
</Callout>

## Chassis: Dell OptiPlex 5090 SFF

Two candidates met the design requirements:

| | Dell OptiPlex 5090 SFF | Lenovo ThinkCentre NEO 50s G3 |
|---|---|---|
| CPU | i7-11700 (8C/16T, 65W) | i7-12700 (12C/20T, 65W) |
| DIMM slots | 4 | 4 |
| PCIe slot | x16 | x16 |
| 3.5" bay | Yes | Yes |
| Used market availability | High — bulk ex-corporate | **Out of stock** |

The ThinkCentre was the first choice on paper — newer CPU, same form factor. But the seller didn't have them in stock. The Dell was available in bulk (same seller, multiple identical units), which matters when you need matching hardware for a cluster. Decision made by availability.

### Why i7-11700 (11th gen), not 12th gen

The 12th gen i7-12700 uses Intel's hybrid architecture — 8 performance cores + 4 efficiency cores. The P-core / E-core split doesn't fit server workloads well. The Linux scheduler needs to be aware of core asymmetry, and Ceph OSD threads landing on E-cores would perform differently than on P-cores. Not a dealbreaker, but an unnecessary complication for a platform that runs 24/7 with consistent workloads.

The i7-11700 is a traditional 8C/16T design — all cores identical, predictable performance. For server workloads, consistency beats theoretical peak throughput.

### What's included with the chassis

The validation node came from the seller with RAM and NVMe already installed:

<Callout title="Included components" variant="tip">
  - **RAM:** 2 x 32 GB DDR4-3200 = 64 GB
  - **NVMe:** Seller-provided drive in M.2 slot (model recorded during validation — used for fast OSD testing, enterprise replacement planned for production)
</Callout>

| Component | Detail | Price |
|-----------|--------|-------|
| Dell OptiPlex 5090 SFF (i7-11700, 64 GB RAM, NVMe included) | Ex-corporate, Allegro.pl | 3,360.00 PLN (~781 EUR) |

## NIC: Intel X710-DA2

The design requires a 10 Gbps NIC with SFP+ ports. The Intel X710-DA2 is the standard choice — dual SFP+ 10GbE, `i40e` driver, and listed on the [Red Hat Ecosystem Catalog](https://catalog.redhat.com/en/hardware/detail/236147) as certified hardware. For a platform built on SCOS (same kernel and driver stack as RHEL), picking a Red Hat certified NIC removes driver compatibility guesswork.

| Spec | Value |
|------|-------|
| Model | Intel X710-DA2 |
| Ports | 2x SFP+ 10GbE |
| Driver | i40e |
| PCIe | x8 Gen 3 |
| Price | 299.00 PLN (~70 EUR) |

Bought one for validation. Whether it works in the Dell OptiPlex 5090 SFF is what validation will tell.

### Why SFP+ with DAC, not RJ45 10GbE

| | SFP+ with DAC | RJ45 10GbE |
|---|---|---|
| Power per port | ~2-3W | ~5-8W |
| NIC heat | Low | Significant — 10G PHYs run hot |
| Cable length | DAC up to ~3m | Cat6a up to 55m |
| Switch compatibility | Matches SFP+ switches | Needs RJ45 10G ports |

For a rack where everything is within 1-2m, DAC wins. Less power, less heat. The 3m length limit isn't relevant.

## Network: MikroTik

### Brand choice

MikroTik is a European company (Latvia). I'd rather buy EU and support a European vendor than overpay for Ubiquiti's marketing and packaging aesthetics. MikroTik hardware is capable, deeply configurable (RouterOS gives you full control), and significantly cheaper at equivalent specs — especially in the 10G SFP+ space where Ubiquiti's premium is hard to justify.

### Switch: MikroTik CRS317-1G-16S+RM

The initial candidate was the **CRS309-1G-8S+IN** — 8 SFP+ ports, desktop form factor, cheaper. But the math is tight:

| | CRS309-1G-8S+IN | CRS317-1G-16S+RM |
|---|---|---|
| SFP+ ports | 8 | 16 |
| Phase 1 usage | 1 trunk + 3 nodes (2 ports each if bonding) = 7 | Same |
| Phase 2 usage | 1 trunk + 5 nodes = would need bonding dropped | 1 trunk + 5 nodes x 2 = 11, 5 spare |
| Form factor | Desktop | 1U rackmount |
| Expansion headroom | Almost none | Plenty |

The CRS309 works for Phase 1 with single-port-per-node config, but any expansion — bonding, Phase 2 nodes, additional devices — would max it out immediately. The CRS317 has 16 ports, rack-mounts cleanly, and gives room to grow. Worth the extra cost to not hit a wall in six months.

| Component | Price |
|-----------|-------|
| MikroTik CRS317-1G-16S+RM | 1,664.36 PLN (~387 EUR) |

### Router: MikroTik CCR2004-16G-2S+PC

Two variants of the CCR2004: the standard **CCR2004-16G-2S+** and the **CCR2004-16G-2S+PC** (passive cooling). Same hardware, same specs — 16x RJ45 1G, 2x SFP+ 10G, ARM64 CPU. The PC version has no fan.

For a homelab in a living space, silence matters. The standard CCR2004 fan is audible. The PC version runs passively — zero noise. Same price range, easy choice.

| Component | Price |
|-----------|-------|
| MikroTik CCR2004-16G-2S+PC | 1,549.91 PLN (~360 EUR) |

## Storage: boot SSD

I looked through enterprise SATA SSDs around 400 GB on Allegro — the usual suspects (Intel DC S3500, S3510, S3610, S3700, Samsung PM863, etc.). The D3-S3610 had the right combination of MLC endurance and price. Condition wasn't known at purchase — SMART data gets checked during validation.

| Spec | Value |
|------|-------|
| Model | Intel D3-S3610 400GB |
| Interface | SATA 2.5" |
| NAND | MLC |
| Condition at purchase | Unknown — SMART check during validation |
| Price | 220.00 PLN (~51 EUR) |
| Source | Allegro.pl (used) |

<Callout title="Why MLC matters for boot" variant="warning">
  etcd fsyncs on every Kubernetes API change — sustained write workload. TLC/QLC drives have lower endurance and can slow down as the SLC cache fills.
</Callout>

## Storage: NVMe and HDD

**NVMe:** Included with the chassis. Model will be recorded during validation. Used for fast OSD testing in Phase 0. Enterprise NVMe replacement planned for production — specific model decided based on used market availability after validation.

**HDD:** Not purchased. HDDs are the most expensive per-node component and the decision can wait. Rook-Ceph deployment and initial testing can happen with just the NVMe OSD. Slow pool HDDs will be sourced after the platform is proven.

<Callout title="HDD candidates" variant="note">
  | | Seagate Exos 24TB | Toshiba MD08 16TB |
  |---|---|---|
  | Cost per TB | Best on Polish market | Budget option |
  | Source | Allegro.pl | Allegro.pl |

  **Seagate Exos Mach.2 (dual-actuator) ruled out** — presents as two block devices, breaks Ceph CRUSH failure domain assumptions.
</Callout>

## Cabling and modules

Not everything connects with DAC cables. The ISP uplink to the router and the Mac mini connection to the switch use SFP+ RJ45 modules (copper transceivers).

| Component | Detail | Price |
|-----------|--------|-------|
| SFP+ RJ45 module (MikroTik S+RJ10) | ISP uplink → CCR2004 | 239.65 PLN (~56 EUR) |
| SFP+ RJ45 module (MikroTik S+RJ10) | Mac mini → CRS317 | 214.60 PLN (~50 EUR) |
| DAC 0.5m (Ubiquiti) | Router ↔ Switch trunk | 56.64 PLN (~13 EUR) |
| DAC 1m x 2 (MikroTik XS+DA0001) | Switch ↔ Node (validation) | 190.75 PLN (~44 EUR) |

## Validation BOM — total

| Component | Price (PLN) | Price (EUR) | Condition |
|-----------|-------------|-------------|-----------|
| Dell OptiPlex 5090 SFF (i7-11700, 64 GB, NVMe) | 3,360.00 | ~781 | Used |
| Intel X710-DA2 | 299.00 | ~70 | Used |
| Intel D3-S3610 400GB | 220.00 | ~51 | Used |
| MikroTik CCR2004-16G-2S+PC | 1,549.91 | ~360 | New |
| MikroTik CRS317-1G-16S+RM | 1,664.36 | ~387 | New |
| SFP+ RJ45 module (ISP → router) | 239.65 | ~56 | New |
| SFP+ RJ45 module (Mac → switch) | 214.60 | ~50 | New |
| DAC 0.5m Ubiquiti (router ↔ switch) | 56.64 | ~13 | New |
| DAC 1m x 2 MikroTik (switch ↔ node) | 190.75 | ~44 | New |
| **Total** | **7,794.91 PLN** | **~1,812 EUR** | |

All prices from Allegro.pl, used/refurbished where applicable.

## What comes after validation

This BOM gets one node and the network infrastructure ready. After Phase 0 (OKD SNO) proves the hardware works:

<Callout title="Next steps" variant="summary">
  - **NIC compatibility verdict** — does the X710 work in the 5090 SFF?
  - **Nodes 2-3** — same chassis, same seller, but with 128 GB RAM (4 x 32 GB per node)
  - **Enterprise NVMe** — replace the seller-included drive with something suitable for Ceph OSD
  - **HDDs** — sourced after Rook-Ceph is deployed
  - **Final BOM post** — complete pricing, lessons from validation, and any hardware swaps
</Callout>
