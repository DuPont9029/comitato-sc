"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BrowserProvider, Contract, decodeBytes32String } from "ethers";
import * as ethers from "ethers";
import { MetaMaskSDK } from "@metamask/sdk";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "../lib/contract";

export default function Home() {
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);
  const [isRep, setIsRep] = useState<boolean>(false);
  const [hasVotingRight, setHasVotingRight] = useState<boolean>(false);
  const [hasVoted, setHasVoted] = useState<boolean>(false);
  const [status, setStatus] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    setIsMobile(
      typeof navigator !== "undefined" &&
      /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
    );
  }, []);

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
        try {
          setStatus("Apro MetaMask…");
          const MMSDK = new MetaMaskSDK({
            injectProvider: true,
            dappMetadata: {
              name: "Comitato Studentesco",
              url: window.location.href,
            },
          });
          const ethereum = MMSDK.getProvider();
          const prov = new BrowserProvider(ethereum as any);
          setProvider(prov);
          const accounts: string[] = await (ethereum as any).request({
            method: "eth_requestAccounts",
          });
          setAccount(accounts[0]);
          const net = await prov.send("eth_chainId", []);
          setChainId(net);
          setStatus("");
        } catch (e) {
          console.error(e);
          setStatus("MetaMask non rilevato. Installa l’app MetaMask.");
        }
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

  const disconnect = useCallback(() => {
    // Nota: MetaMask non espone un vero "disconnect"; puliamo lo stato locale
    setAccount(null);
    setProvider(null);
    setChainId(null);
    setIsRep(false);
    setHasVotingRight(false);
    setHasVoted(false);
    setStatus("");
  }, []);

  const copyAddress = useCallback(async () => {
    if (!account) return;
    try {
      await navigator.clipboard.writeText(account);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch (e: any) {
      console.error(e);
      setStatus("Impossibile copiare l'indirizzo");
    }
  }, [account]);

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
    <div className="min-h-screen bg-linear-to-b from-zinc-50 to-white dark:from-black dark:to-zinc-900 text-zinc-900 dark:text-zinc-100">
      <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
        <h1 className="text-xl font-semibold">
          Comitato Studentesco — Votazioni
        </h1>
        <div className="flex items-center gap-3">
          {account ? (
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-2 rounded-full bg-zinc-100 dark:bg-zinc-800 pl-2 pr-3 py-1 text-sm">
                <AddressAvatar address={account} size={18} />
                <button
                  onClick={copyAddress}
                  className="font-mono hover:underline"
                  title={copied ? "Copiato!" : "Copia"}
                >
                  {account.slice(0, 6)}…{account.slice(-4)}
                </button>
              </span>
              <button
                onClick={disconnect}
                className="rounded-lg bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-100 px-2 py-1 text-xs hover:bg-zinc-300 dark:hover:bg-zinc-600"
              >
                Disconnetti
              </button>
              {copied && <span className="ui-badge">Copiato</span>}
            </div>
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
            {status && <p className="mt-2 text-xs text-red-600">{status}</p>}
            <div className="mt-4 flex gap-2 flex-wrap items-center">
              <button
                onClick={refreshRole}
                className="rounded-lg border border-zinc-300 dark:border-zinc-700 px-3 py-1 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800"
              >
                Aggiorna Stato
              </button>
              {account && (
                <button
                  onClick={disconnect}
                  className="rounded-lg bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-100 px-3 py-1 text-sm hover:bg-zinc-300 dark:hover:bg-zinc-600"
                >
                  Disconnetti
                </button>
              )}
            </div>
          </div>

          <ContractFunds contract={contract} />
          <ActiveProposals contract={contract} />
        </section>

        <section className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          <RepresentativePanel
            contract={contract}
            account={account}
            isRep={isRep}
          />
          <StudentPanel
            contract={contract}
            account={account}
            hasVotingRight={hasVotingRight}
          />
          {!isRep && !isMobile && (
            <FundTransferPanel contract={contract} account={account} />
          )}
        </section>
      </main>
      {!isRep && isMobile && (
        <div className="max-w-6xl mx-auto px-6 pb-8">
          <FundTransferPanel contract={contract} account={account} />
        </div>
      )}

      <footer className="max-w-6xl mx-auto px-6 py-8 text-xs text-zinc-500">
        Contratto:{" "}
        <a
          href="https://etherscan.io/address/0x88f2d5c26395dedbf978079e5142caf548688e72"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          {CONTRACT_ADDRESS}
        </a>
      </footer>
    </div>
  );
}

function FundTransferPanel({
  contract,
  account,
}: {
  contract: Contract | null;
  account: string | null;
}) {
  const [fundTransferProposals, setFundTransferProposals] = useState<any[]>([]);
  const [selectedProposalId, setSelectedProposalId] = useState<string>("");
  const [status, setStatus] = useState<string>("");

  const refreshFundTransferProposals = useCallback(async () => {
    if (!contract) return;
    try {
      const count = await contract.fundTransferProposalCount();
      const proposals = [];
      for (let i = 0; i < count; i++) {
        const proposal = await contract.fundTransferProposals(i);
        const isActive = await contract.isFundTransferProposalActive(i);
        if (isActive) {
          proposals.push({ id: i, ...proposal });
        }
      }
      setFundTransferProposals(proposals);
    } catch (err: any) {
      console.error(err);
      setStatus(
        "Errore nel caricamento delle proposte di trasferimento fondi."
      );
    }
  }, [contract]);

  const executeTransfer = useCallback(async () => {
    if (!contract || !account || !selectedProposalId) return;
    setStatus("Esecuzione trasferimento fondi in corso...");
    try {
      const signer = await (contract.runner as any).provider.getSigner(account);
      const contractWithSigner = contract.connect(signer);
      const tx = await (contractWithSigner as any).executeFundTransfer(
        selectedProposalId
      );
      await tx.wait();
      setStatus("Trasferimento fondi eseguito con successo!");
      refreshFundTransferProposals();
    } catch (err: any) {
      console.error(err);
      setStatus(
        err?.reason || "Errore durante l'esecuzione del trasferimento fondi."
      );
    }
  }, [contract, account, selectedProposalId, refreshFundTransferProposals]);

  useEffect(() => {
    refreshFundTransferProposals();
  }, [refreshFundTransferProposals]);

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
      <h2 className="text-lg font-medium">Proposte di Trasferimento Fondi</h2>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Seleziona una proposta di trasferimento fondi attiva e approvala.
      </p>
      {fundTransferProposals.length > 0 ? (
        <div className="mt-4 space-y-3">
          <select
            value={selectedProposalId}
            onChange={(e) => setSelectedProposalId(e.target.value)}
            className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-transparent"
          >
            <option value="">Seleziona una proposta</option>
            {fundTransferProposals.map((proposal) => (
              <option key={proposal.id} value={proposal.id}>
                ID: {proposal.id} - Destinatario:{" "}
                {proposal.recipient.slice(0, 6)}...
                {proposal.recipient.slice(-4)} - Importo:{" "}
                {ethers.formatEther(proposal.amount)} ETH
              </option>
            ))}
          </select>
          <button
            onClick={executeTransfer}
            disabled={!selectedProposalId || !account}
            className="w-full rounded-lg bg-indigo-500 text-white px-4 py-2 text-sm font-medium hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Esegui Trasferimento Fondi
          </button>
        </div>
      ) : (
        <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
          Nessuna proposta di trasferimento fondi attiva.
        </p>
      )}
      {status && <p className="mt-3 text-xs text-red-600">{status}</p>}
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
      setError(
        "Impossibile caricare proposte attive: inserisci ID manualmente."
      );
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
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
            Nessuna proposta caricata.
          </p>
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

function ProposalRow({
  id,
  contract,
}: {
  id: number;
  contract: Contract | null;
}) {
  const [name, setName] = useState<string>("");
  const [votesPro, setVotesPro] = useState<number>(0);
  const [votesContra, setVotesContra] = useState<number>(0);
  const [active, setActive] = useState<boolean>(false);

  const load = useCallback(async () => {
    if (!contract) return;
    try {
      const p = await contract.proposals(id);
      const n = p.name ? decodeBytes32String(p.name) : "";
      setName(n);
      setVotesPro(Number((p as any).votesPro ?? 0));
      setVotesContra(Number((p as any).votesContra ?? 0));
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
        <p className="text-sm font-medium">
          #{id} {name || "(senza nome)"}
        </p>
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          Pro: {votesPro} • Contra: {votesContra} • Attiva:{" "}
          {active ? "Sì" : "No"}
        </p>
      </div>
    </li>
  );
}

// Nuovo pannello Emiciclo con dropdown e visualizzazione semicircolare
function HemicyclePanel({
  contract,
  ids,
}: {
  contract: Contract | null;
  ids: number[];
}) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [nameMap, setNameMap] = useState<Record<number, string>>({});
  const [voteCount, setVoteCount] = useState<number>(0);
  const [votesProSel, setVotesProSel] = useState<number>(0);
  const [votesContraSel, setVotesContraSel] = useState<number>(0);
  const [selectedName, setSelectedName] = useState<string>("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
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
        } catch { }
      }
      if (!cancelled) {
        setNameMap((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
      }
    }
    fetchNames();
    return () => {
      cancelled = true;
    };
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
          const vp = Number((p as any).votesPro ?? 0);
          const vc = Number((p as any).votesContra ?? 0);
          setVotesProSel(vp);
          setVotesContraSel(vc);
          setVoteCount(vp + vc);
        }
      } catch { }
    }
    fetchSelected();
    return () => {
      cancelled = true;
    };
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
          <p className="text-sm font-medium">Voti</p>
          <div className="h-6 w-24 rounded bg-zinc-800" />
        </div>
        <div className="mt-3 h-28 rounded bg-white dark:bg-zinc-900/40" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 bg-white dark:bg-zinc-900/60">
      <div className="flex items-center justify-between gap-2 overflow-hidden">
        <p className="text-sm font-medium shrink-0">Voti</p>
        <div className="flex items-center gap-2 min-w-0">
          <label className="text-xs text-zinc-400 shrink-0">Proposta</label>
          <select
            value={selectedId ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              setSelectedId(v ? Number(v) : null);
            }}
            title={
              selectedId != null
                ? `#${selectedId} ${selectedName ? `— ${selectedName}` : ""}`
                : "— Seleziona —"
            }
            className="min-w-0 w-[180px] max-w-[180px] truncate pr-6 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
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
          {/* Sedute emiciclo: default tutte visibili grigie, altrimenti colorazione pro/contra */}
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
            : seatsOrdered.map((p, i) => {
              const proLimit = votesProSel;
              const contraLimit = votesProSel + votesContraSel;
              const cls =
                i < proLimit
                  ? "text-green-500"
                  : i < contraLimit
                    ? "text-red-500"
                    : "text-zinc-700";
              return (
                <circle
                  key={i}
                  cx={p.x}
                  cy={p.y}
                  r={seatR}
                  fill="currentColor"
                  className={cls}
                />
              );
            })}

          {/* Centro con 4 sedute rappresentanti (solo in vista default) */}
          {showDefault && (
            <g>
              {Array.from({ length: 4 }).map((_, i) => (
                <circle
                  key={i}
                  cx={cx + (i - 1.5) * 18}
                  cy={cy - 25}
                  r={seatR}
                  fill="currentColor"
                  className="text-zinc-500"
                />
              ))}
            </g>
          )}
        </svg>
      </div>

      {selectedId != null && (
        <div className="mt-3 text-xs text-zinc-400">
          <span className="font-medium text-zinc-200">#{selectedId}</span>
          {selectedName ? ` — ${selectedName}` : ""}
          <span className="ml-2">
            Pro: {votesProSel} • Contra: {votesContraSel} (Totale: {voteCount})
          </span>
        </div>
      )}
    </div>
  );
}

function RepresentativePanel({
  contract,
  account,
  isRep,
}: {
  contract: Contract | null;
  account: string | null;
  isRep: boolean;
}) {
  if (!isRep) {
    return null;
  }
  return (
    <RepresentativePanelInner
      contract={contract}
      account={account}
      isRep={isRep}
    />
  );
}

function RepresentativePanelInner({
  contract,
  account,
  isRep,
}: {
  contract: Contract | null;
  account: string | null;
  isRep: boolean;
}) {
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
  const [repActive, setRepActive] = useState<string | null>(null);
  const [studentActive, setStudentActive] = useState<string | null>(null);
  const [proposalActive, setProposalActive] = useState<string | null>(null);

  const [fundsStatus, setFundsStatus] = useState("");
  const [fundsRecipient, setFundsRecipient] = useState("");
  const [fundsAmount, setFundsAmount] = useState("");
  const [fundsProposalId, setFundsProposalId] = useState("");
  const [fundsActive, setFundsActive] = useState<string | null>(null);

  const send = useCallback(
    async (fn: () => Promise<any>) => {
      if (!contract) return;
      try {
        setStatus("Invio transazione…");
        const signer = await (contract.runner as BrowserProvider).getSigner();
        const c = contract.connect(signer);
        const tx = await fn.call(c);
        await tx.wait();
        setStatus("✅ Operazione completata");
      } catch (e: any) {
        console.error(e);
        setStatus(
          `❌ Errore: ${e?.shortMessage ?? e?.message ?? "transazione"}`
        );
      }
    },
    [contract]
  );

  const proposeFundTransfer = useCallback(async () => {
    if (!contract) return;
    try {
      setFundsStatus("Creo proposta trasferimento…");
      const signer = await (contract.runner as BrowserProvider).getSigner();
      const c = contract.connect(signer);
      const amountWei = ethers.parseEther(fundsAmount || "0");
      const tx = await (c as any).addFundTransferProposal(
        fundsRecipient,
        amountWei
      );
      await tx.wait();
      setFundsStatus("✅ Proposta di trasferimento creata");
      setFundsRecipient("");
      setFundsAmount("");
    } catch (e: any) {
      console.error(e);
      setFundsStatus(
        `❌ Errore: ${e?.shortMessage ?? e?.message ?? "proposta trasferimento"
        }`
      );
    }
  }, [contract, fundsRecipient, fundsAmount]);

  const actFundProposal = useCallback(
    async (action: "activate" | "deactivate" | "vote" | "execute") => {
      if (!contract || !fundsProposalId) return;
      try {
        setFundsStatus("Processo proposta fondi…");
        const signer = await (contract.runner as BrowserProvider).getSigner();
        const c = contract.connect(signer);
        const idNum = Number(fundsProposalId);
        let tx;
        if (action === "activate")
          tx = await (c as any).activateFundTransferProposal(idNum);
        else if (action === "deactivate")
          tx = await (c as any).deactivateFundTransferProposal(idNum);
        else if (action === "vote")
          tx = await (c as any).voteForFundTransfer(idNum);
        else tx = await (c as any).executeFundTransfer(idNum);
        await tx.wait();
        setFundsStatus("✅ Operazione fondi completata");
      } catch (e: any) {
        console.error(e);
        setFundsStatus(
          `❌ Errore: ${e?.shortMessage ?? e?.message ?? "fondi"}`
        );
      }
    },
    [contract, fundsProposalId]
  );

  const reuseFundProposal = useCallback(async () => {
    if (!contract || !fundsProposalId) return;
    try {
      setFundsStatus("Riutilizzo proposta fondi…");
      const signer = await (contract.runner as BrowserProvider).getSigner();
      const c = contract.connect(signer);
      const idNum = Number(fundsProposalId);
      const amountWei = ethers.parseEther(fundsAmount || "0");
      const tx = await (c as any).updateFundTransferProposal(
        idNum,
        fundsRecipient,
        amountWei
      );
      await tx.wait();
      setFundsStatus("✅ Proposta fondi riutilizzata");
      setFundsRecipient("");
      setFundsAmount("");
    } catch (e: any) {
      console.error(e);
      setFundsStatus(
        `❌ Errore: ${e?.shortMessage ?? e?.message ?? "riuso proposta fondi"}`
      );
    }
  }, [contract, fundsProposalId, fundsRecipient, fundsAmount]);

  return (
    <div className="rounded-xl border border-zinc-800 p-6 bg-zinc-900/60 shadow-sm max-w-5xl mx-auto space-y-6">
      <h2 className="text-lg font-semibold tracking-tight">
        Area Rappresentanti
      </h2>
      {!isRep && (
        <p className="mt-2 text-xs text-amber-600">
          Devi essere rappresentante per usare queste funzioni.
        </p>
      )}
      {status && <p className="mt-2 text-xs">{status}</p>}

      <div className="mt-4 grid grid-cols-1 gap-4">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 space-y-3">
          <p className="text-xs font-semibold tracking-wide uppercase text-zinc-400">
            Gestione Rappresentanti
          </p>
          <div className="space-y-3">
            <input
              value={addrAdd}
              onFocus={() => setRepActive("add")}
              onChange={(e) => {
                const v = e.target.value;
                setAddrAdd(v);
                if (v) setRepActive("add");
              }}
              placeholder="Indirizzo da aggiungere"
              className="min-w-0 w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-transparent"
            />
            <input
              value={addrRem}
              onFocus={() => setRepActive("remove")}
              onChange={(e) => {
                const v = e.target.value;
                setAddrRem(v);
                if (v) setRepActive("remove");
              }}
              placeholder="Indirizzo da rimuovere"
              className="min-w-0 w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-transparent"
            />
            <input
              value={repProposalId}
              onFocus={() => setRepActive("vote")}
              onChange={(e) => {
                const v = e.target.value;
                setRepProposalId(v);
                if (v) setRepActive("vote");
              }}
              placeholder="ID proposta rappresentanti"
              className="min-w-0 w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-transparent"
            />
          </div>
          <div className="pt-3 mt-1 border-t border-zinc-800 flex flex-wrap gap-2">
            {repActive === "add" && addrAdd && (
              <button
                disabled={disabled}
                onClick={() =>
                  send(function (this: any) {
                    return this.proposeAddRepresentative(addrAdd);
                  })
                }
                className="rounded-md bg-indigo-500 text-white px-2.5 py-1.5 text-xs disabled:opacity-50 transition-colors hover:bg-indigo-600"
              >
                Proponi aggiunta
              </button>
            )}
            {repActive === "remove" && addrRem && (
              <button
                disabled={disabled}
                onClick={() =>
                  send(function (this: any) {
                    return this.proposeRemoveRepresentative(addrRem);
                  })
                }
                className="rounded-md bg-rose-500 text-white px-2.5 py-1.5 text-xs disabled:opacity-50 transition-colors hover:bg-rose-600"
              >
                Proponi rimozione
              </button>
            )}
            {repActive === "vote" && repProposalId && (
              <>
                <button
                  disabled={disabled}
                  onClick={() =>
                    send(function (this: any) {
                      return this.voteOnRepresentativeProposal(
                        Number(repProposalId),
                        true
                      );
                    })
                  }
                  className="rounded-md bg-indigo-500 text-white px-2.5 py-1.5 text-xs disabled:opacity-50 transition-colors hover:bg-indigo-600"
                >
                  Vota favore
                </button>
                <button
                  disabled={disabled}
                  onClick={() =>
                    send(function (this: any) {
                      return this.voteOnRepresentativeProposal(
                        Number(repProposalId),
                        false
                      );
                    })
                  }
                  className="rounded-md bg-yellow-500 text-black px-2.5 py-1.5 text-xs disabled:opacity-50 transition-colors hover:bg-yellow-600"
                >
                  Vota contro
                </button>
              </>
            )}
          </div>
        </div>

        <div className="ui-panel">
          <p className="ui-section-title">Gestione Fondi</p>
          {fundsStatus && (
            <p
              className={
                fundsStatus.startsWith("❌")
                  ? "ui-alert-danger"
                  : "ui-alert-success"
              }
            >
              {fundsStatus}
            </p>
          )}
          <div className="space-y-3">
            <input
              value={fundsRecipient}
              onFocus={() => setFundsActive("transfer")}
              onChange={(e) => {
                const v = e.target.value;
                setFundsRecipient(v);
                if (v) setFundsActive("transfer");
              }}
              placeholder="Destinatario (address)"
              className="ui-input ui-input-warning"
            />
            <input
              value={fundsAmount}
              onFocus={() => setFundsActive("transfer")}
              onChange={(e) => {
                const v = e.target.value;
                setFundsAmount(v);
                if (v) setFundsActive("transfer");
              }}
              placeholder="Importo in ETH"
              className="ui-input ui-input-warning"
            />
            <input
              value={fundsProposalId}
              onFocus={() => setFundsActive("manage")}
              onChange={(e) => {
                const v = e.target.value;
                setFundsProposalId(v);
                if (v) setFundsActive("manage");
              }}
              placeholder="ID proposta fondi"
              className="ui-input ui-input-warning"
            />
          </div>
          <div className="pt-3 mt-1 border-t border-zinc-800 flex flex-wrap gap-2">
            {fundsActive === "transfer" && fundsRecipient && fundsAmount && (
              <button
                disabled={disabled}
                onClick={proposeFundTransfer}
                className="ui-button"
              >
                Crea proposta trasferimento
              </button>
            )}
            {fundsActive === "manage" && fundsProposalId && (
              <>
                <button
                  disabled={disabled}
                  onClick={() => actFundProposal("activate")}
                  className="ui-button"
                >
                  Attiva
                </button>
                <button
                  disabled={disabled}
                  onClick={() => actFundProposal("deactivate")}
                  className="ui-button-danger"
                >
                  Disattiva
                </button>
                <button
                  disabled={disabled}
                  onClick={() => actFundProposal("vote")}
                  className="ui-button"
                >
                  Vota
                </button>
                <button
                  disabled={disabled}
                  onClick={() => actFundProposal("execute")}
                  className="ui-button-success"
                >
                  Esegui
                </button>
              </>
            )}
            {fundsRecipient && fundsAmount && fundsProposalId && (
              <button
                disabled={disabled}
                onClick={reuseFundProposal}
                className="ui-button-success"
              >
                Riutilizza proposta fondi
              </button>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 space-y-3">
          <p className="text-xs font-semibold tracking-wide uppercase text-zinc-400">
            Gestione Studenti
          </p>
          <div className="space-y-3">
            <input
              value={addrGive}
              onFocus={() => setStudentActive("give")}
              onChange={(e) => {
                const v = e.target.value;
                setAddrGive(v);
                if (v) setStudentActive("give");
              }}
              placeholder="Concedi diritto di voto"
              className="min-w-0 w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-transparent"
            />
            <input
              value={addrRevoke}
              onFocus={() => setStudentActive("revoke")}
              onChange={(e) => {
                const v = e.target.value;
                setAddrRevoke(v);
                if (v) setStudentActive("revoke");
              }}
              placeholder="Revoca diritto di voto"
              className="min-w-0 w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-transparent"
            />
            <input
              value={batchVoters}
              onFocus={() => setStudentActive("batch")}
              onChange={(e) => {
                const v = e.target.value;
                setBatchVoters(v);
                if (v) setStudentActive("batch");
              }}
              placeholder="Indirizzi separati da virgola"
              className="min-w-0 w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-transparent"
            />
          </div>
          <div className="pt-3 mt-1 border-t border-zinc-800 flex flex-wrap gap-2">
            {studentActive === "give" && addrGive && (
              <button
                disabled={disabled}
                onClick={() =>
                  send(function (this: any) {
                    return this.giveRightToVote(addrGive);
                  })
                }
                className="rounded-md bg-indigo-500 text-white px-2.5 py-1.5 text-xs disabled:opacity-50 transition-colors hover:bg-indigo-600"
              >
                Concedi
              </button>
            )}
            {studentActive === "revoke" && addrRevoke && (
              <button
                disabled={disabled}
                onClick={() =>
                  send(function (this: any) {
                    return this.revokeRightToVote(addrRevoke);
                  })
                }
                className="rounded-md bg-indigo-500 text-white px-2.5 py-1.5 text-xs disabled:opacity-50 transition-colors hover:bg-indigo-600"
              >
                Revoca
              </button>
            )}
            {studentActive === "batch" && batchVoters && (
              <button
                disabled={disabled}
                onClick={() => {
                  const arr = batchVoters
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean);
                  send(function (this: any) {
                    return this.giveRightToVoteMultiple(arr);
                  });
                }}
                className="rounded-md bg-indigo-500 text-white px-2.5 py-1.5 text-xs disabled:opacity-50 transition-colors hover:bg-indigo-600"
              >
                Concedi multiplo
              </button>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 space-y-3">
          <p className="text-xs font-semibold tracking-wide uppercase text-zinc-400">
            Gestione Proposte
          </p>
          <div className="space-y-3">
            <input
              value={proposalName}
              onFocus={() => setProposalActive("add")}
              onChange={(e) => {
                const v = e.target.value;
                setProposalName(v);
                if (v) setProposalActive("add");
              }}
              placeholder="Nome proposta (max 32 char)"
              className="min-w-0 w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-transparent"
            />
            <input
              value={proposalId}
              onFocus={() => setProposalActive("id")}
              onChange={(e) => {
                const v = e.target.value;
                setProposalId(v);
                if (v) setProposalActive("id");
              }}
              placeholder="ID proposta"
              className="ui-input ui-input-warning"
            />
            <input
              value={newName}
              onFocus={() => setProposalActive("reuse")}
              onChange={(e) => {
                const v = e.target.value;
                setNewName(v);
                if (v) setProposalActive("reuse");
              }}
              placeholder="Nuovo nome"
              className="ui-input ui-input-warning"
            />
          </div>
          <div className="pt-3 mt-1 border-t border-zinc-800 flex flex-wrap gap-2">
            {proposalActive === "add" && proposalName && (
              <button
                disabled={disabled || !proposalName}
                onClick={() =>
                  send(function (this: any) {
                    return this.addProposal(proposalName);
                  })
                }
                className="rounded-md bg-indigo-500 text-white px-2.5 py-1.5 text-xs disabled:opacity-50 transition-colors hover:bg-indigo-600"
              >
                Aggiungi
              </button>
            )}
            {proposalActive === "id" && proposalId && (
              <>
                <button
                  disabled={disabled}
                  onClick={() =>
                    send(function (this: any) {
                      return this.deactivateProposal(Number(proposalId));
                    })
                  }
                  className="rounded-md bg-rose-500 text-white px-2.5 py-1.5 text-xs disabled:opacity-50 transition-colors hover:bg-rose-600"
                >
                  Disattiva
                </button>
                <button
                  disabled={disabled}
                  onClick={() =>
                    send(function (this: any) {
                      return this.reactivateProposal(Number(proposalId));
                    })
                  }
                  className="rounded-md bg-indigo-500 text-white px-2.5 py-1.5 text-xs disabled:opacity-50 transition-colors hover:bg-indigo-600"
                >
                  Riattiva
                </button>
              </>
            )}
            {proposalActive === "reuse" && newName && proposalId && (
              <button
                disabled={disabled}
                onClick={() =>
                  send(function (this: any) {
                    return this.reuseProposal(Number(proposalId), newName);
                  })
                }
                className="rounded-md bg-indigo-500 text-white px-2.5 py-1.5 text-xs disabled:opacity-50 transition-colors hover:bg-indigo-600"
              >
                Riutilizza slot
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ContractFunds({ contract }: { contract: Contract | null }) {
  const [balanceEth, setBalanceEth] = useState<string>("0");
  const [error, setError] = useState<string>("");
  const [depositAmount, setDepositAmount] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [eurRate, setEurRate] = useState<number | null>(null);

  const refreshFiat = useCallback(async () => {
    try {
      const res = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=eur"
      );
      const data = await res.json();
      const rate = data?.ethereum?.eur;
      if (typeof rate === "number") setEurRate(rate);
    } catch (e) {
      console.error("Errore recupero EUR", e);
    }
  }, []);

  const refresh = useCallback(async () => {
    setError("");
    try {
      if (!contract || !contract.runner) return;
      const provider = contract.runner as BrowserProvider;
      const bal = await provider.getBalance(CONTRACT_ADDRESS);
      setBalanceEth(ethers.formatEther(bal));
    } catch (e: any) {
      console.error(e);
      setError(e?.shortMessage ?? e?.message ?? "Errore nel recupero saldo");
    } finally {
      await refreshFiat();
    }
  }, [contract, refreshFiat]);

  const deposit = useCallback(async () => {
    if (!contract) return;
    try {
      setStatus("Invio fondi…");
      const signer = await (contract.runner as BrowserProvider).getSigner();
      const tx = await signer.sendTransaction({
        to: CONTRACT_ADDRESS,
        value: ethers.parseEther(depositAmount || "0"),
      });
      await tx.wait();
      setStatus("✅ Deposito eseguito");
      setDepositAmount("");
      refresh();
    } catch (e: any) {
      console.error(e);
      setStatus(`❌ Errore: ${e?.shortMessage ?? e?.message ?? "deposito"}`);
    }
  }, [contract, depositAmount, refresh]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const eurValue = eurRate != null ? Number(balanceEth || "0") * eurRate : null;

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
      <h2 className="text-lg font-medium">Fondi del Comitato</h2>

      <p className="mt-2 text-sm">
        Saldo: {balanceEth} ETH{" "}
        {eurValue != null && (
          <span className="text-zinc-400">
            (~
            {eurValue.toLocaleString("it-IT", {
              style: "currency",
              currency: "EUR",
            })}
            )
          </span>
        )}
      </p>
      {error && <p className="mt-2 text-xs text-amber-600">{error}</p>}
      {status && (
        <p
          className={
            status.startsWith("❌") ? "ui-alert-danger" : "ui-alert-success"
          }
        >
          {status}
        </p>
      )}
      <div className="mt-3">
        <input
          value={depositAmount}
          onChange={(e) => setDepositAmount(e.target.value)}
          placeholder="Importo in ETH"
          className="ui-input w-full"
        />
      </div>
      {depositAmount && (
        <div className="mt-2 flex gap-2">
          <button onClick={deposit} className="ui-button">
            Deposita
          </button>
          <button onClick={refresh} className="ui-button-secondary">
            Aggiorna
          </button>
        </div>
      )}
    </div>
  );
}

function StudentPanel({
  contract,
  account,
  hasVotingRight,
}: {
  contract: Contract | null;
  account: string | null;
  hasVotingRight: boolean;
}) {
  if (!account) {
    return null;
  }
  return (
    <StudentPanelInner
      contract={contract}
      account={account}
      hasVotingRight={hasVotingRight}
    />
  );
}

function StudentPanelInner({
  contract,
  account,
  hasVotingRight,
}: {
  contract: Contract | null;
  account: string | null;
  hasVotingRight: boolean;
}) {
  const disabled = !contract || !account;
  const [proposalIdStudent, setProposalIdStudent] = useState("");

  const vote = useCallback(async () => {
    if (!contract) return;
    try {
      const signer = await (contract.runner as BrowserProvider).getSigner();
      const c = contract.connect(signer);
      const tx = await (c as any).votePro(Number(proposalIdStudent));
      await tx.wait();
    } catch (e: any) {
      console.error(e);
    }
  }, [contract, proposalIdStudent]);

  const [ids, setIds] = useState<number[]>([]);
  const [error, setError] = useState<string>("");

  const load = useCallback(async () => {
    setError("");
    if (!contract) return;
    try {
      const result = await contract.getActiveProposalIds();
      setIds(result.map((n: any) => Number(n)));
    } catch (e: any) {
      setError("Impossibile caricare l'elenco delle proposte attive.");
    }
  }, [contract]);

  useEffect(() => {
    load();
  }, [load]);

  const votePro = useCallback(
    async (id: number) => {
      if (!contract) return;
      try {
        const signer = await (contract.runner as BrowserProvider).getSigner();
        const c = contract.connect(signer);
        const tx = await (c as any).votePro(id);
        await tx.wait();
        load();
      } catch (e: any) {
        console.error(e);
      }
    },
    [contract, load]
  );

  const voteContra = useCallback(
    async (id: number) => {
      if (!contract) return;
      try {
        const signer = await (contract.runner as BrowserProvider).getSigner();
        const c = contract.connect(signer);
        const tx = await (c as any).voteContra(id);
        await tx.wait();
        load();
      } catch (e: any) {
        console.error(e);
      }
    },
    [contract, load]
  );

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 bg-white dark:bg-zinc-900/60 shadow-sm max-w-5xl mx-auto space-y-4">
      <h2 className="text-lg font-semibold tracking-tight">Area Studenti</h2>
      <div className="grid grid-cols-1 gap-4">
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-4">
          <div>
            <p className="text-sm text-zinc-700 dark:text-zinc-300">
              Seleziona una proposta attiva per votare.
            </p>
            {error && <p className="mt-2 text-xs text-amber-600">{error}</p>}
            {!ids.length ? (
              <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
                Nessuna proposta attiva trovata.
              </p>
            ) : (
              <ul className="mt-3 max-h-64 overflow-y-auto space-y-2">
                {ids.map((id) => (
                  <StudentProposalRow
                    key={id}
                    id={id}
                    contract={contract}
                    disabled={disabled || !hasVotingRight}
                    onVotePro={() => votePro(id)}
                    onVoteContra={() => voteContra(id)}
                  />
                ))}
              </ul>
            )}
            <button
              onClick={load}
              className="mt-3 rounded-md border border-zinc-300 dark:border-zinc-700 px-2.5 py-1.5 text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800"
            >
              Aggiorna elenco
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StudentProposalRow({
  id,
  contract,
  disabled,
  onVotePro,
  onVoteContra,
}: {
  id: number;
  contract: Contract | null;
  disabled: boolean;
  onVotePro: () => void;
  onVoteContra: () => void;
}) {
  const [name, setName] = useState<string>("");
  const [votesPro, setVotesPro] = useState<number>(0);
  const [votesContra, setVotesContra] = useState<number>(0);
  const [active, setActive] = useState<boolean>(false);

  const load = useCallback(async () => {
    if (!contract) return;
    try {
      const p = await contract.proposals(id);
      const n = p.name ? decodeBytes32String(p.name) : "";
      setName(n);
      setVotesPro(Number((p as any).votesPro ?? 0));
      setVotesContra(Number((p as any).votesContra ?? 0));
      setActive(Boolean(p.active));
    } catch (e) {
      setName("—");
    }
  }, [contract, id]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <li className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3">
      <div>
        <p className="text-sm font-medium break-words">
          #{id} {name || "(senza nome)"}
        </p>
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          Pro: {votesPro} • Contra: {votesContra} • Attiva:{" "}
          {active ? "Sì" : "No"}
        </p>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          disabled={disabled}
          onClick={onVotePro}
          className="rounded-md bg-indigo-500 text-white px-2.5 py-1.5 text-xs disabled:opacity-50 transition-colors hover:bg-indigo-600"
        >
          Vota Pro
        </button>
        <button
          disabled={disabled}
          onClick={onVoteContra}
          className="rounded-md bg-yellow-500 text-black px-2.5 py-1.5 text-xs disabled:opacity-50 transition-colors hover:bg-yellow-600"
        >
          Vota Contro
        </button>
      </div>
    </li>
  );
}

function AddressAvatar({
  address,
  size = 24,
}: {
  address: string;
  size?: number;
}) {
  // Generazione semplice di identicon SVG basato sull'indirizzo (seeded)
  const seed = Array.from(address.toLowerCase()).reduce(
    (acc, ch) => acc + ch.charCodeAt(0),
    0
  );
  function rnd(i: number) {
    let x = (seed + i * 9973) % 2147483647;
    x = (x * 48271) % 2147483647;
    return x / 2147483647;
  }
  const hue = Math.floor(rnd(1) * 360);
  const fg = `hsl(${hue}, 70%, 50%)`;
  const bg = `hsl(${(hue + 180) % 360}, 40%, 92%)`;
  const cells: boolean[] = [];
  for (let y = 0; y < 5; y++) {
    const row: boolean[] = [];
    for (let x = 0; x < 3; x++) {
      row.push(rnd(y * 5 + x) > 0.5);
    }
    // Specchia per ottenere 5 colonne
    cells.push(...row, row[1], row[0]);
  }
  const cellSize = size / 5;
  const rects = [] as any[];
  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < 5; x++) {
      const idx = y * 5 + x;
      rects.push({ x: x * cellSize, y: y * cellSize, on: cells[idx] });
    }
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      xmlns="http://www.w3.org/2000/svg"
      style={{ borderRadius: "50%", background: bg }}
    >
      {rects.map((r, i) => (
        <rect
          key={i}
          x={r.x}
          y={r.y}
          width={cellSize}
          height={cellSize}
          fill={r.on ? fg : "transparent"}
        />
      ))}
    </svg>
  );
}
