"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BrowserProvider, Contract, decodeBytes32String } from "ethers";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "../lib/contract";

export default function Home() {
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);
  const [isRep, setIsRep] = useState<boolean>(false);
  const [hasVotingRight, setHasVotingRight] = useState<boolean>(false);
  const [hasVoted, setHasVoted] = useState<boolean>(false);
  const [status, setStatus] = useState<string>("");

  const contract = useMemo(() => {
    if (!provider) return null;
    return new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
  }, [provider]);

  const refreshRole = useCallback(async () => {
    if (!provider || !account || !contract) return;
    try {
      const rep: boolean = await contract.representatives(account);
      const voter = await contract.voters(account);
      setIsRep(rep);
      setHasVotingRight(voter.hasVotingRight);
      setHasVoted(voter.hasVoted);
    } catch (err: any) {
      console.error(err);
    }
  }, [provider, account, contract]);

  const connect = useCallback(async () => {
    try {
      if (!(window as any).ethereum) {
        setStatus("MetaMask non rilevato. Installa l’estensione.");
        return;
      }
      const prov = new BrowserProvider((window as any).ethereum);
      setProvider(prov);
      const accounts: string[] = await (window as any).ethereum.request({
        method: "eth_requestAccounts",
      });
      setAccount(accounts[0]);
      const net = await prov.send("eth_chainId", []);
      setChainId(net);
      setStatus("");
    } catch (err: any) {
      console.error(err);
      setStatus(err?.message || "Errore di connessione wallet");
    }
  }, []);

  useEffect(() => {
    if ((window as any).ethereum) {
      (window as any).ethereum.on("accountsChanged", (accs: string[]) => {
        setAccount(accs?.[0] ?? null);
      });
      (window as any).ethereum.on("chainChanged", (cid: string) => {
        setChainId(cid);
      });
    }
  }, []);

  useEffect(() => {
    refreshRole();
  }, [refreshRole]);

  const isMainnet = chainId === "0x1";

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-black dark:to-zinc-900 text-zinc-900 dark:text-zinc-100">
      <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
        <h1 className="text-xl font-semibold">Comitato Studentesco — Votazioni</h1>
        <div className="flex items-center gap-3">
          {account ? (
            <span className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-3 py-1 text-sm">
              {account.slice(0, 6)}…{account.slice(-4)}
            </span>
          ) : (
            <button
              onClick={connect}
              className="rounded-lg bg-black text-white px-4 py-2 text-sm hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
            >
              Collega Wallet
            </button>
          )}
          {chainId && (
            <span className="text-xs text-zinc-500">
              Rete: {isMainnet ? "Ethereum Mainnet" : chainId}
            </span>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-1 space-y-4">
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
            <h2 className="text-lg font-medium">Stato Utente</h2>
            <ul className="mt-3 space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
              <li>Rappresentante: {isRep ? "Sì" : "No"}</li>
              <li>Ha diritto di voto: {hasVotingRight ? "Sì" : "No"}</li>
              <li>Ha già votato: {hasVoted ? "Sì" : "No"}</li>
            </ul>
            {!isMainnet && (
              <p className="mt-3 text-xs text-amber-600">
                Consiglio: collega a Ethereum Mainnet per operazioni reali.
              </p>
            )}
            {status && (
              <p className="mt-2 text-xs text-red-600">{status}</p>
            )}
            <div className="mt-4">
              <button
                onClick={refreshRole}
                className="rounded-lg border border-zinc-300 dark:border-zinc-700 px-3 py-1 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800"
              >
                Aggiorna Stato
              </button>
            </div>
          </div>

          <ActiveProposals contract={contract} />
        </section>

        <section className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          <RepresentativePanel contract={contract} account={account} isRep={isRep} />
          <StudentPanel contract={contract} account={account} hasVotingRight={hasVotingRight} />
        </section>
      </main>

      <footer className="max-w-6xl mx-auto px-6 py-8 text-xs text-zinc-500">
        Contratto: {CONTRACT_ADDRESS}
      </footer>
    </div>
  );
}

function ActiveProposals({ contract }: { contract: Contract | null }) {
  const [ids, setIds] = useState<number[]>([]);
  const [error, setError] = useState<string>("");

  const load = useCallback(async () => {
    setError("");
    if (!contract) return;
    try {
      const result = await contract.getActiveProposalIds();
      setIds(result.map((n: any) => Number(n)));
    } catch (e: any) {
      setError("Impossibile caricare proposte attive: inserisci ID manualmente.");
    }
  }, [contract]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-4">
      <div>
        <h2 className="text-lg font-medium">Proposte Attive</h2>
        {error && <p className="mt-2 text-xs text-amber-600">{error}</p>}
        {!ids.length ? (
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">Nessuna proposta caricata.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {ids.map((id) => (
              <ProposalRow key={id} id={id} contract={contract} />
            ))}
          </ul>
        )}
        <button
          onClick={load}
          className="mt-4 rounded-lg border border-zinc-300 dark:border-zinc-700 px-3 py-1 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800"
        >
          Aggiorna elenco
        </button>
      </div>

      {/* Emiciclo */}
      <HemicyclePanel contract={contract} ids={ids} />
    </div>
  );
}

function ProposalRow({ id, contract }: { id: number; contract: Contract | null }) {
  const [name, setName] = useState<string>("");
  const [count, setCount] = useState<number>(0);
  const [active, setActive] = useState<boolean>(false);

  const load = useCallback(async () => {
    if (!contract) return;
    try {
      const p = await contract.proposals(id);
      const n = p.name ? decodeBytes32String(p.name) : "";
      setName(n);
      setCount(Number(p.voteCount));
      setActive(Boolean(p.active));
    } catch (e) {
      setName("—");
    }
  }, [contract, id]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <li className="flex items-center justify-between rounded-lg border border-zinc-200 dark:border-zinc-800 p-3">
      <div>
        <p className="text-sm font-medium">#{id} {name || "(senza nome)"}</p>
        <p className="text-xs text-zinc-600 dark:text-zinc-400">Voti: {count} • Attiva: {active ? "Sì" : "No"}</p>
      </div>
    </li>
  );
}

// Nuovo pannello Emiciclo con dropdown e visualizzazione semicircolare
function HemicyclePanel({ contract, ids }: { contract: Contract | null; ids: number[] }) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [nameMap, setNameMap] = useState<Record<number, string>>({});
  const [voteCount, setVoteCount] = useState<number>(0);
  const [selectedName, setSelectedName] = useState<string>("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);
  // Prefetch nomi per il dropdown
  useEffect(() => {
    let cancelled = false;
    async function fetchNames() {
      if (!contract || !ids.length) return;
      const entries: [number, string][] = [];
      for (const id of ids) {
        try {
          const p = await contract.proposals(id);
          const n = p?.name ? decodeBytes32String(p.name) : "";
          entries.push([id, n]);
        } catch {}
      }
      if (!cancelled) {
        setNameMap((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
      }
    }
    fetchNames();
    return () => { cancelled = true; };
  }, [contract, ids]);

  // Carica dettagli per la proposta selezionata
  useEffect(() => {
    let cancelled = false;
    async function fetchSelected() {
      if (!contract || selectedId == null) return;
      try {
        const p = await contract.proposals(selectedId);
        const n = p?.name ? decodeBytes32String(p.name) : "";
        if (!cancelled) {
          setSelectedName(n);
          setVoteCount(Number(p.voteCount) || 0);
        }
      } catch {}
    }
    fetchSelected();
    return () => { cancelled = true; };
  }, [contract, selectedId]);

  // Configurazione sedute dell’emiciclo
  const rows = [16, 14, 12]; // totale 42 sedute
  const totalSeats = rows.reduce((a, b) => a + b, 0);
  const radii = [130, 100, 70];
  const seatR = 7;
  const svgW = 320;
  const svgH = 180;
  const cx = svgW / 2;
  const cy = svgH - 10;

  function arcPoints(count: number, radius: number) {
    const pts: { x: number; y: number }[] = [];
    const step = Math.PI / (count - 1);
    for (let i = 0; i < count; i++) {
      const angle = Math.PI - i * step;
      const x = cx + radius * Math.cos(angle);
      const y = cy - radius * Math.sin(angle);
      pts.push({ x, y });
    }
    return pts;
  }

  const seats: { x: number; y: number }[] = [];
  rows.forEach((c, i) => {
    arcPoints(c, radii[i]).forEach((p) => seats.push(p));
  });

  // Ordina i posti per riempimento simmetrico dal centro verso l'esterno, riga interna -> esterna
  const seatsOrdered: { x: number; y: number }[] = [];
  rows.forEach((c, i) => {
    const pts = arcPoints(c, radii[i]);
    pts.sort((a, b) => Math.abs(a.x - cx) - Math.abs(b.x - cx));
    seatsOrdered.push(...pts);
  });

  const filledSeats = Math.max(0, Math.min(voteCount, totalSeats));
  const showDefault = selectedId == null || voteCount === 0;

  if (!mounted) {
    return (
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 bg-white dark:bg-zinc-900/60">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Emiciclo</p>
          <div className="h-6 w-24 rounded bg-zinc-800" />
        </div>
        <div className="mt-3 h-28 rounded bg-white dark:bg-zinc-900/40" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 bg-white dark:bg-zinc-900/60">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Emiciclo</p>
        <div className="flex items-center gap-2">
          <label className="text-xs text-zinc-400">Proposta</label>
          <select
            value={selectedId ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              setSelectedId(v ? Number(v) : null);
            }}
            className="rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="">— Seleziona —</option>
            {ids.map((id) => (
              <option key={id} value={id}>
                #{id} {nameMap[id] ? `— ${nameMap[id]}` : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-center">
        <svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`}>
          {/* Sedute emiciclo: default tutte visibili grigie, altrimenti solo N sedute */}
          {showDefault
            ? seats.map((p, i) => (
                <circle
                  key={i}
                  cx={p.x}
                  cy={p.y}
                  r={seatR}
                  fill="currentColor"
                  className="text-zinc-700"
                />
              ))
            : seatsOrdered.slice(0, filledSeats).map((p, i) => (
                <circle
                  key={i}
                  cx={p.x}
                  cy={p.y}
                  r={seatR}
                  fill="currentColor"
                  className="text-indigo-500"
                />
              ))}

          {/* Centro con 4 sedute rappresentanti (solo in vista default) */}
          {showDefault && (
            <g>
              {Array.from({ length: 4 }).map((_, i) => (
                <circle
                  key={i}
                  cx={cx - 11 + (i % 2) * 22}
                  cy={cy - 38 + Math.floor(i / 2) * 22}
                  r={seatR + 1}
                  fill="currentColor"
                  className="text-zinc-300"
                />
              ))}
              <text
                x={cx}
                y={cy - 10}
                textAnchor="middle"
                className="text-[10px] fill-zinc-400"
              >REP</text>
            </g>
          )}
        </svg>
      </div>

      {selectedId != null && (
        <div className="mt-3 text-xs text-zinc-400">
          <span className="font-medium text-zinc-200">#{selectedId}</span>
          {selectedName ? ` — ${selectedName}` : ""}
          <span className="ml-2">Voti: {voteCount}</span>
        </div>
      )}
    </div>
  );
}

function RepresentativePanel({ contract, account, isRep }: { contract: Contract | null; account: string | null; isRep: boolean; }) {
  if (!isRep) {
    return null;
  }
  const disabled = !contract || !account || !isRep;
  const [addrAdd, setAddrAdd] = useState("");
  const [addrRem, setAddrRem] = useState("");
  const [addrGive, setAddrGive] = useState("");
  const [addrRevoke, setAddrRevoke] = useState("");
  const [batchVoters, setBatchVoters] = useState("");
  const [proposalName, setProposalName] = useState("");
  const [proposalId, setProposalId] = useState("");
  const [newName, setNewName] = useState("");
  const [repProposalId, setRepProposalId] = useState("");
  const [status, setStatus] = useState("");
  // add active action trackers for dynamic forms
  const [repActive, setRepActive] = useState<string | null>(null);
  const [studentActive, setStudentActive] = useState<string | null>(null);
  const [proposalActive, setProposalActive] = useState<string | null>(null);

  const send = useCallback(async (fn: () => Promise<any>) => {
    if (!contract) return;
    try {
      setStatus("Invio transazione…");
      const signer = await (contract.runner as BrowserProvider).getSigner()
      const c = contract.connect(signer)
      const tx = await fn.call(c)
      await tx.wait()
      setStatus("✅ Operazione completata");
    } catch (e: any) {
      console.error(e);
      setStatus(`❌ Errore: ${e?.shortMessage ?? e?.message ?? "transazione"}`);
    }
  }, [contract]);

  return (
    <div className="rounded-xl border border-zinc-800 p-6 bg-zinc-900/60 shadow-sm max-w-5xl mx-auto space-y-6">
      <h2 className="text-lg font-semibold tracking-tight">Area Rappresentanti</h2>
      {!isRep && <p className="mt-2 text-xs text-amber-600">Devi essere rappresentante per usare queste funzioni.</p>}
      {status && <p className="mt-2 text-xs">{status}</p>}

      <div className="mt-4 grid grid-cols-1 gap-4">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 space-y-3">
          <p className="text-xs font-semibold tracking-wide uppercase text-zinc-400">Gestione Rappresentanti</p>
          <div className="space-y-3">
            <input value={addrAdd} onFocus={() => setRepActive('add')} onChange={(e) => { const v = e.target.value; setAddrAdd(v); if (v) setRepActive('add'); }} placeholder="Indirizzo da aggiungere" className="min-w-0 w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-transparent" />
            <input value={addrRem} onFocus={() => setRepActive('remove')} onChange={(e) => { const v = e.target.value; setAddrRem(v); if (v) setRepActive('remove'); }} placeholder="Indirizzo da rimuovere" className="min-w-0 w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-transparent" />
            <input value={repProposalId} onFocus={() => setRepActive('vote')} onChange={(e) => { const v = e.target.value; setRepProposalId(v); if (v) setRepActive('vote'); }} placeholder="ID proposta rappresentanti" className="min-w-0 w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-transparent" />
          </div>
          <div className="pt-3 mt-1 border-t border-zinc-800 flex flex-wrap gap-2">
            {repActive === 'add' && addrAdd && (
              <button disabled={disabled} onClick={() => send(function(this: any){ return this.proposeAddRepresentative(addrAdd); })} className="rounded-md bg-indigo-500 text-white px-2.5 py-1.5 text-xs disabled:opacity-50 transition-colors hover:bg-indigo-600">Proponi aggiunta</button>
            )}
            {repActive === 'remove' && addrRem && (
              <button disabled={disabled} onClick={() => send(function(this: any){ return this.proposeRemoveRepresentative(addrRem); })} className="rounded-md bg-rose-500 text-white px-2.5 py-1.5 text-xs disabled:opacity-50 transition-colors hover:bg-rose-600">Proponi rimozione</button>
            )}
            {repActive === 'vote' && repProposalId && (
              <>
                <button disabled={disabled} onClick={() => send(function(this: any){ return this.voteOnRepresentativeProposal(Number(repProposalId), true); })} className="rounded-md bg-indigo-500 text-white px-2.5 py-1.5 text-xs disabled:opacity-50 transition-colors hover:bg-indigo-600">Vota favore</button>
                <button disabled={disabled} onClick={() => send(function(this: any){ return this.voteOnRepresentativeProposal(Number(repProposalId), false); })} className="rounded-md bg-rose-500 text-white px-2.5 py-1.5 text-xs disabled:opacity-50 transition-colors hover:bg-rose-600">Vota contro</button>
              </>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 space-y-3">
          <p className="text-xs font-semibold tracking-wide uppercase text-zinc-400">Gestione Studenti</p>
          <div className="space-y-3">
            <input value={addrGive} onFocus={() => setStudentActive('give')} onChange={(e) => { const v = e.target.value; setAddrGive(v); if (v) setStudentActive('give'); }} placeholder="Concedi diritto di voto" className="min-w-0 w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-transparent" />
            <input value={addrRevoke} onFocus={() => setStudentActive('revoke')} onChange={(e) => { const v = e.target.value; setAddrRevoke(v); if (v) setStudentActive('revoke'); }} placeholder="Revoca diritto di voto" className="min-w-0 w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-transparent" />
            <input value={batchVoters} onFocus={() => setStudentActive('batch')} onChange={(e) => { const v = e.target.value; setBatchVoters(v); if (v) setStudentActive('batch'); }} placeholder="Indirizzi separati da virgola" className="min-w-0 w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-transparent" />
          </div>
          <div className="pt-3 mt-1 border-t border-zinc-800 flex flex-wrap gap-2">
            {studentActive === 'give' && addrGive && (
              <button disabled={disabled} onClick={() => send(function(this: any){ return this.giveRightToVote(addrGive); })} className="rounded-md bg-indigo-500 text-white px-2.5 py-1.5 text-xs disabled:opacity-50 transition-colors hover:bg-indigo-600">Concedi</button>
            )}
            {studentActive === 'revoke' && addrRevoke && (
              <button disabled={disabled} onClick={() => send(function(this: any){ return this.revokeRightToVote(addrRevoke); })} className="rounded-md bg-indigo-500 text-white px-2.5 py-1.5 text-xs disabled:opacity-50 transition-colors hover:bg-indigo-600">Revoca</button>
            )}
            {studentActive === 'batch' && batchVoters && (
              <button disabled={disabled} onClick={() => { const arr = batchVoters.split(',').map((s) => s.trim()).filter(Boolean); send(function(this: any){ return this.giveRightToVoteMultiple(arr); }); }} className="rounded-md bg-indigo-500 text-white px-2.5 py-1.5 text-xs disabled:opacity-50 transition-colors hover:bg-indigo-600">Concedi multiplo</button>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 space-y-3">
          <p className="text-xs font-semibold tracking-wide uppercase text-zinc-400">Gestione Proposte</p>
          <div className="space-y-3">
            <input value={proposalName} onFocus={() => setProposalActive('add')} onChange={(e) => { const v = e.target.value; setProposalName(v); if (v) setProposalActive('add'); }} placeholder="Nome proposta (max 32 char)" className="min-w-0 w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-transparent" />
            <input value={proposalId} onFocus={() => setProposalActive('id')} onChange={(e) => { const v = e.target.value; setProposalId(v); if (v) setProposalActive('id'); }} placeholder="ID proposta" className="min-w-0 w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-transparent" />
            <input value={newName} onFocus={() => setProposalActive('reuse')} onChange={(e) => { const v = e.target.value; setNewName(v); if (v) setProposalActive('reuse'); }} placeholder="Nuovo nome" className="min-w-0 w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-transparent" />
          </div>
          <div className="pt-3 mt-1 border-t border-zinc-800 flex flex-wrap gap-2">
            {proposalActive === 'add' && proposalName && (
              <button disabled={disabled || !proposalName} onClick={() => send(function(this: any){ return this.addProposal(proposalName); })} className="rounded-md bg-indigo-500 text-white px-2.5 py-1.5 text-xs disabled:opacity-50 transition-colors hover:bg-indigo-600">Aggiungi</button>
            )}
            {proposalActive === 'id' && proposalId && (
              <>
                <button disabled={disabled} onClick={() => send(function(this: any){ return this.deactivateProposal(Number(proposalId)); })} className="rounded-md bg-rose-500 text-white px-2.5 py-1.5 text-xs disabled:opacity-50 transition-colors hover:bg-rose-600">Disattiva</button>
                <button disabled={disabled} onClick={() => send(function(this: any){ return this.reactivateProposal(Number(proposalId)); })} className="rounded-md bg-indigo-500 text-white px-2.5 py-1.5 text-xs disabled:opacity-50 transition-colors hover:bg-indigo-600">Riattiva</button>
              </>
            )}
            {proposalActive === 'reuse' && newName && proposalId && (
              <button disabled={disabled} onClick={() => send(function(this: any){ return this.reuseProposal(Number(proposalId), newName); })} className="rounded-md bg-indigo-500 text-white px-2.5 py-1.5 text-xs disabled:opacity-50 transition-colors hover:bg-indigo-600">Riutilizza slot</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StudentPanel({ contract, account, hasVotingRight }: { contract: Contract | null; account: string | null; hasVotingRight: boolean; }) {
  if (!account) {
    return null;
  }

  const disabled = !contract || !account;
  const [proposalIdStudent, setProposalIdStudent] = useState("");

  const vote = useCallback(async () => {
    if (!contract) return;
    try {
      const signer = await (contract.runner as BrowserProvider).getSigner();
      const c = contract.connect(signer);
      const tx = await (c as any).vote(Number(proposalIdStudent));
      await tx.wait();
    } catch (e: any) {
      console.error(e);
    }
  }, [contract, proposalIdStudent]);

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 bg-white dark:bg-zinc-900/60 shadow-sm max-w-5xl mx-auto space-y-4">
      <h2 className="text-lg font-semibold tracking-tight">Area Studenti</h2>
      <div className="grid grid-cols-1 gap-4">
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-4">
          <div className="grid grid-cols-12 gap-5 items-end">
            <div className="col-span-12 md:col-span-9">
              <input
                value={proposalIdStudent}
                onChange={(e) => setProposalIdStudent(e.target.value)}
                placeholder="ID proposta"
                className="min-w-0 w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-transparent"
              />
            </div>
            <div className="col-span-12 md:col-span-3 md:pl-4 flex gap-2 md:justify-end">
              <button
                disabled={disabled || !hasVotingRight}
                onClick={vote}
                className="rounded-md bg-indigo-500 text-white px-2.5 py-1.5 text-xs disabled:opacity-50 transition-colors hover:bg-indigo-600"
              >
                Vota
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
