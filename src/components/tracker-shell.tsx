"use client";

import type { inferRouterOutputs } from "@trpc/server";
import {
	AlertTriangle,
	CalendarDays,
	CheckCircle2,
	ChevronDown,
	ExternalLink,
	Filter,
	ListChecks,
	Lock,
	MapPin,
	PencilLine,
	RadioTower,
	SearchCheck,
	Settings,
	UserRoundSearch,
	X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
	type ApplicationStatus,
	applicationStatuses,
	processingTone,
	statusLabel,
	statusTone,
} from "@/lib/status";
import { cn, formatDateTime } from "@/lib/utils";
import type { AppRouter } from "@/server/trpc";
import { useAdminStore } from "@/store/admin-store";
import { useFilterStore } from "@/store/filter-store";
import { trpc } from "@/trpc/client";

type RouterOutput = inferRouterOutputs<AppRouter>;
type DocumentItem = RouterOutput["documents"]["list"][number];

type ConcoursCase = {
	id: string;
	title: string;
	primary: DocumentItem;
	documents: DocumentItem[];
	totalSeats: number | null;
	radiologySeats: number | null;
	examDate: Date | string | null;
	deadline: Date | string | null;
	center: string | null;
	hasCandidateMatch: boolean;
	hasCandidateCheck: boolean;
	hasReview: boolean;
	hasConflict: boolean;
	isRadiologyRelevant: boolean;
	latestUpdate: DocumentItem;
};

export function TrackerShell() {
	const { data = [], isLoading } = trpc.documents.list.useQuery();
	const utils = trpc.useUtils();
	const updateAdmin = trpc.documents.updateAdmin.useMutation({
		onSuccess: () => utils.documents.list.invalidate(),
	});
	const filter = useFilterStore((state) => state.filter);
	const setFilter = useFilterStore((state) => state.setFilter);
	const adminToken = useAdminStore((state) => state.adminToken);
	const setAdminToken = useAdminStore((state) => state.setAdminToken);
	const clearAdminToken = useAdminStore((state) => state.clearAdminToken);
	const [draftToken, setDraftToken] = useState("");
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
	const [editing, setEditing] = useState<string | null>(null);
	const [expandedSpecialties, setExpandedSpecialties] = useState<
		Record<string, boolean>
	>({});
	const [draft, setDraft] = useState<{
		applicationStatus: ApplicationStatus;
		adminNotes: string;
	}>({ applicationStatus: "new", adminNotes: "" });

	const cases = useMemo(() => groupConcours(data), [data]);

	const filtered = useMemo(() => {
		return cases.filter((item) => {
			if (filter === "all") return true;
			if (filter === "review") return item.hasReview;
			return item.isRadiologyRelevant || item.hasReview;
		});
	}, [cases, filter]);

	const selectedCase = selectedCaseId
		? cases.find((item) => item.id === selectedCaseId)
		: null;

	const stats = useMemo(() => {
		const focus = cases.filter(
			(item) => item.isRadiologyRelevant || item.hasReview,
		);
		return {
			total: cases.length,
			radiology: focus.length,
			review: cases.filter((item) => item.hasReview).length,
			conflicts: cases.filter((item) => item.hasConflict).length,
			seats: focus.reduce((sum, item) => sum + (item.radiologySeats ?? 0), 0),
			matches: cases.filter((item) => item.hasCandidateMatch).length,
		};
	}, [cases]);

	function beginEdit(item: DocumentItem) {
		setEditing(item.id);
		setDraft({
			applicationStatus: item.applicationStatus,
			adminNotes: item.adminNotes,
		});
	}

	return (
		<main className="min-h-screen bg-[#f8f1e7] text-stone-950">
			<section className="border-b border-stone-300/70 bg-[#fbf7ef]">
				<div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 py-8 sm:px-8 lg:px-10">
					<div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
						<div className="max-w-3xl">
							<div className="mb-4 flex items-center gap-3 text-sm font-medium text-amber-900">
								<RadioTower className="h-4 w-4" />
								Moroccan paramedical concours watcher
							</div>
							<h1 className="font-serif text-4xl leading-tight text-stone-950 sm:text-6xl">
								Concours grouped by story, not by PDF.
							</h1>
							<p className="mt-5 max-w-2xl text-base leading-7 text-stone-700 sm:text-lg">
								Each concours stays in one place as notices, planning, lists, and
								assignment updates arrive.
							</p>
						</div>
						<div className="grid grid-cols-2 gap-3 sm:grid-cols-6 lg:w-[620px]">
							<Stat label="Concours" value={stats.total} />
							<Stat label="ITS focus" value={stats.radiology} />
							<Stat label="Seats" value={stats.seats} />
							<Stat label="Review" value={stats.review} />
							<Stat label="Conflicts" value={stats.conflicts} />
							<Stat label="Name hits" value={stats.matches} />
						</div>
					</div>

					<div className="flex flex-col gap-3 border-t border-stone-300/70 pt-5 lg:flex-row lg:items-center lg:justify-between">
						<div className="flex flex-wrap items-center gap-2">
							<Button
								variant={filter === "radiology" ? "default" : "outline"}
								onClick={() => setFilter("radiology")}
							>
								<SearchCheck className="h-4 w-4" />
								ITS focus
							</Button>
							<Button
								variant={filter === "review" ? "default" : "outline"}
								onClick={() => setFilter("review")}
							>
								<AlertTriangle className="h-4 w-4" />
								Needs review
							</Button>
							<Button
								variant={filter === "all" ? "default" : "outline"}
								onClick={() => setFilter("all")}
							>
								<Filter className="h-4 w-4" />
								All
							</Button>
						</div>
						<Button variant="ghost" onClick={() => setSettingsOpen(true)}>
							{adminToken ? (
								<CheckCircle2 className="h-4 w-4 text-emerald-700" />
							) : (
								<Lock className="h-4 w-4" />
							)}
							Decision access
						</Button>
					</div>
				</div>
			</section>

			<section className="mx-auto grid w-full max-w-7xl gap-4 px-5 py-6 sm:px-8 lg:px-10">
				{isLoading ? (
					<div className="rounded-md border border-stone-300 bg-white/70 p-6">
						Loading concours...
					</div>
				) : null}
				{filtered.map((item) => (
					<article
						key={item.id}
						className="rounded-lg border border-stone-300 bg-[#fffaf2] p-5 shadow-sm"
					>
						<div className="grid gap-5 lg:grid-cols-[1fr_320px]">
							<div className="min-w-0">
								<div className="mb-3 flex flex-wrap gap-2">
									<Badge className={statusTone(item.primary.applicationStatus)}>
										{statusLabel(item.primary.applicationStatus)}
									</Badge>
									{item.latestUpdate.updateLabel ? (
										<Badge className="border-sky-200 bg-sky-100 text-sky-950">
											Latest: {item.latestUpdate.updateLabel}
										</Badge>
									) : null}
									{item.isRadiologyRelevant ? (
										<Badge className="border-emerald-200 bg-emerald-100 text-emerald-900">
											radiology
										</Badge>
									) : null}
									{item.hasCandidateMatch ? (
										<Badge className="border-violet-200 bg-violet-100 text-violet-950">
											name found
										</Badge>
									) : null}
									{item.hasConflict ? (
										<Badge className="border-orange-200 bg-orange-100 text-orange-900">
											same-day conflict
										</Badge>
									) : null}
								</div>
								<h2 className="font-serif text-2xl leading-snug">{item.title}</h2>
								<div className="mt-4 grid gap-3 text-sm text-stone-700 sm:grid-cols-2 lg:grid-cols-4">
									<Info
										icon={<CalendarDays className="h-4 w-4" />}
										label="Exam"
										value={formatDateTime(item.examDate)}
									/>
									<Info
										icon={<CalendarDays className="h-4 w-4" />}
										label="Deadline"
										value={formatDateTime(item.deadline)}
									/>
									<Info
										icon={<MapPin className="h-4 w-4" />}
										label="Place"
										value={item.center ?? "Unknown"}
									/>
									<Info
										icon={<RadioTower className="h-4 w-4" />}
										label="Radiology seats"
										value={item.radiologySeats?.toString() ?? "Unknown"}
									/>
								</div>
								<div className="mt-5 flex flex-wrap gap-2">
									{item.documents.map((document) => (
										<DocumentPill key={document.id} item={document} />
									))}
								</div>
							</div>

							<div className="flex flex-col gap-3">
								<div className="rounded-md border border-stone-300 bg-white/60 p-3 text-sm">
									<div className="mb-2 flex items-center gap-2 font-medium text-stone-950">
										<ListChecks className="h-4 w-4 text-amber-900" />
										Decision
									</div>
									<div className="flex flex-wrap gap-2">
										<DecisionChip
											active={item.primary.applicationStatus === "apply"}
											label="Apply"
										/>
										<DecisionChip
											active={item.primary.applicationStatus === "maybe"}
											label="Maybe"
										/>
										<DecisionChip
											active={item.primary.applicationStatus === "applied"}
											label="Applied"
										/>
										<DecisionChip
											active={item.primary.applicationStatus === "skip"}
											label="Skip"
										/>
									</div>
									<p className="mt-3 whitespace-pre-wrap text-stone-700">
										{item.primary.adminNotes || "No decision notes yet."}
									</p>
								</div>
								<Button onClick={() => setSelectedCaseId(item.id)}>
									<ListChecks className="h-4 w-4" />
									Details
								</Button>
								<Button asChild variant="outline">
									<a
										href={
											item.primary.hasAttachment
												? item.primary.pdfUrl
												: item.primary.sourcePageUrl
										}
										target="_blank"
										rel="noreferrer"
									>
										<ExternalLink className="h-4 w-4" />
										Open main document
									</a>
								</Button>
							</div>
						</div>
					</article>
				))}
			</section>

			{selectedCase ? (
				<DetailsDialog
					concoursCase={selectedCase}
					adminToken={adminToken}
					editing={editing}
					draft={draft}
					expandedSpecialties={expandedSpecialties}
					updatePending={updateAdmin.isPending}
					onClose={() => {
						setSelectedCaseId(null);
						setEditing(null);
					}}
					onBeginEdit={beginEdit}
					onDraftChange={setDraft}
					onToggleSpecialties={(id) =>
						setExpandedSpecialties((current) => ({
							...current,
							[id]: !current[id],
						}))
					}
					onSave={(document) =>
						updateAdmin.mutate(
							{
								id: document.id,
								...draft,
							},
							{ onSuccess: () => setEditing(null) },
						)
					}
					onCancelEdit={() => setEditing(null)}
				/>
			) : null}

			{settingsOpen ? (
				<div className="fixed inset-0 z-50 grid place-items-center bg-stone-950/35 px-4">
					<div className="w-full max-w-md rounded-lg border border-stone-300 bg-[#fffaf2] p-5 shadow-xl">
						<div className="mb-4 flex items-start justify-between gap-4">
							<div>
								<div className="flex items-center gap-2 font-medium">
									<Settings className="h-4 w-4 text-amber-900" />
									Decision access
								</div>
								<p className="mt-1 text-sm text-stone-600">
									The token stays in this browser and is only used when you edit
									decisions.
								</p>
							</div>
							<Button
								variant="ghost"
								size="icon"
								aria-label="Close decision access"
								onClick={() => setSettingsOpen(false)}
							>
								<X className="h-4 w-4" />
							</Button>
						</div>
						<div className="flex flex-col gap-3 sm:flex-row">
							<Input
								type="password"
								placeholder="Admin token"
								value={draftToken}
								onChange={(event) => setDraftToken(event.target.value)}
							/>
							<Button
								onClick={() => {
									if (draftToken) setAdminToken(draftToken);
									else clearAdminToken();
									setSettingsOpen(false);
								}}
							>
								{adminToken ? "Update" : "Unlock"}
							</Button>
						</div>
						{adminToken ? (
							<Button
								className="mt-3"
								variant="ghost"
								onClick={() => {
									clearAdminToken();
									setDraftToken("");
									setSettingsOpen(false);
								}}
							>
								Forget token
							</Button>
						) : null}
					</div>
				</div>
			) : null}
		</main>
	);
}

function groupConcours(items: DocumentItem[]): ConcoursCase[] {
	const groups = new Map<string, DocumentItem[]>();
	for (const item of items) {
		const key = item.listingKey ?? item.id;
		groups.set(key, [...(groups.get(key) ?? []), item]);
	}

	return [...groups.entries()]
		.map(([key, documents]) => {
			const sorted = [...documents].sort(
				(a, b) =>
					new Date(b.discoveredAt).getTime() -
					new Date(a.discoveredAt).getTime(),
			);
			const primary =
				sorted.find((item) => item.documentType === "notice") ??
				sorted.find((item) => item.totalSeats || item.radiologySeats) ??
				sorted[0];
			const latestUpdate = sorted[0];
			return {
				id: key,
				title: displayTitle(primary),
				primary,
				documents: sorted,
				totalSeats: firstNumber(sorted, "totalSeats"),
				radiologySeats: firstNumber(sorted, "radiologySeats"),
				examDate: firstValue(sorted, "examDate"),
				deadline: firstValue(sorted, "applicationDeadline"),
				center: firstValue(sorted, "center") ?? firstValue(sorted, "region"),
				hasCandidateMatch: sorted.some((item) => item.candidateMatched === true),
				hasCandidateCheck: sorted.some(
					(item) => item.candidateMatched !== null,
				),
				hasReview: sorted.some(
					(item) =>
						item.processingStatus === "needs_review" ||
						item.processingStatus === "failed",
				),
				hasConflict: sorted.some((item) => item.sameDayConflict),
				isRadiologyRelevant: sorted.some(
					(item) => item.isRadiologyRelevant || item.radiologySeats,
				),
				latestUpdate,
			};
		})
		.sort(
			(a, b) =>
				new Date(b.examDate ?? b.latestUpdate.discoveredAt).getTime() -
				new Date(a.examDate ?? a.latestUpdate.discoveredAt).getTime(),
		);
}

function firstValue<K extends keyof DocumentItem>(
	items: DocumentItem[],
	key: K,
): DocumentItem[K] | null {
	return items.find((item) => item[key] !== null && item[key] !== undefined)?.[
		key
	] ?? null;
}

function firstNumber<K extends "totalSeats" | "radiologySeats">(
	items: DocumentItem[],
	key: K,
) {
	return items.find((item) => typeof item[key] === "number")?.[key] ?? null;
}

function displayTitle(item: DocumentItem) {
	const region = item.region
		?.replace(/concours de recrutement de/gi, "")
		.replace(/infirmiers? et techniciens? de santé/gi, "ITS")
		.replace(/direction régionale/gi, "")
		.replace(/\s+/g, " ")
		.trim();
	const parts = [
		region || item.title,
		item.totalSeats ? `${item.totalSeats} postes` : null,
		item.radiologySeats ? `${item.radiologySeats} radiologie` : null,
	].filter(Boolean);

	return parts.join(" · ");
}

function DocumentPill({ item }: { item: DocumentItem }) {
	return (
		<span className="inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white/70 px-3 py-1 text-xs font-medium text-stone-700">
			{item.updateLabel ?? item.documentType}
			<span
				className={cn(
					"h-1.5 w-1.5 rounded-full",
					item.processingStatus === "processed" && "bg-emerald-500",
					item.processingStatus === "needs_review" && "bg-orange-500",
					item.processingStatus === "failed" && "bg-red-500",
					item.processingStatus === "pending" && "bg-stone-400",
					item.processingStatus === "processing" && "bg-blue-500",
				)}
			/>
		</span>
	);
}

function DecisionChip({ active, label }: { active: boolean; label: string }) {
	return (
		<span
			className={cn(
				"rounded-full border px-2.5 py-1 text-xs font-medium",
				active
					? "border-amber-300 bg-amber-100 text-amber-950"
					: "border-stone-200 bg-white/60 text-stone-500",
			)}
		>
			{label}
		</span>
	);
}

function DetailsDialog({
	concoursCase,
	adminToken,
	editing,
	draft,
	expandedSpecialties,
	updatePending,
	onClose,
	onBeginEdit,
	onDraftChange,
	onToggleSpecialties,
	onSave,
	onCancelEdit,
}: {
	concoursCase: ConcoursCase;
	adminToken: string;
	editing: string | null;
	draft: { applicationStatus: ApplicationStatus; adminNotes: string };
	expandedSpecialties: Record<string, boolean>;
	updatePending: boolean;
	onClose: () => void;
	onBeginEdit: (item: DocumentItem) => void;
	onDraftChange: React.Dispatch<
		React.SetStateAction<{
			applicationStatus: ApplicationStatus;
			adminNotes: string;
		}>
	>;
	onToggleSpecialties: (id: string) => void;
	onSave: (item: DocumentItem) => void;
	onCancelEdit: () => void;
}) {
	return (
		<div className="fixed inset-0 z-40 overflow-y-auto bg-stone-950/35 px-4 py-6">
			<div className="mx-auto w-full max-w-5xl rounded-lg border border-stone-300 bg-[#fffaf2] shadow-xl">
				<div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-stone-300 bg-[#fffaf2] p-5">
					<div>
						<div className="mb-2 flex flex-wrap gap-2">
							<Badge className={statusTone(concoursCase.primary.applicationStatus)}>
								{statusLabel(concoursCase.primary.applicationStatus)}
							</Badge>
							{concoursCase.hasCandidateMatch ? (
								<Badge className="border-violet-200 bg-violet-100 text-violet-950">
									name found
								</Badge>
							) : null}
						</div>
						<h2 className="font-serif text-3xl leading-tight">
							{concoursCase.title}
						</h2>
					</div>
					<Button
						variant="ghost"
						size="icon"
						aria-label="Close details"
						onClick={onClose}
					>
						<X className="h-4 w-4" />
					</Button>
				</div>

				<div className="grid gap-5 p-5 lg:grid-cols-[1fr_300px]">
					<div className="grid gap-4">
						{concoursCase.documents.map((item) => (
							<section
								key={item.id}
								className="rounded-md border border-stone-300 bg-white/60 p-4"
							>
								<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
									<div>
										<div className="mb-2 flex flex-wrap gap-2">
											<Badge className={processingTone(item.processingStatus)}>
												{item.processingStatus.replace("_", " ")}
											</Badge>
											{item.updateLabel ? (
												<Badge className="border-sky-200 bg-sky-100 text-sky-950">
													{item.updateLabel}
												</Badge>
											) : null}
											{!item.hasAttachment ? (
												<Badge className="border-orange-200 bg-orange-100 text-orange-900">
													no attachment yet
												</Badge>
											) : null}
											{item.candidateMatched === true ? (
												<Badge className="border-violet-200 bg-violet-100 text-violet-950">
													name found
												</Badge>
											) : item.candidateMatched === false ? (
												<Badge className="border-stone-200 bg-stone-100 text-stone-700">
													name checked
												</Badge>
											) : null}
										</div>
										<h3 className="font-serif text-xl leading-snug">
											{displayTitle(item)}
										</h3>
										<p className="mt-1 text-sm text-stone-600">
											Detected {formatDateTime(item.discoveredAt)}
										</p>
									</div>
									<Button asChild variant="outline">
										<a
											href={item.hasAttachment ? item.pdfUrl : item.sourcePageUrl}
											target="_blank"
											rel="noreferrer"
										>
											<ExternalLink className="h-4 w-4" />
											{item.hasAttachment ? "PDF" : "Source"}
										</a>
									</Button>
								</div>

								{item.candidateMatched !== null ? (
									<div className="mt-3 rounded-md border border-violet-200 bg-violet-50 px-3 py-2 text-sm text-violet-950">
										<div className="flex items-center gap-2 font-medium">
											<UserRoundSearch className="h-4 w-4" />
											Candidate check:{" "}
											{item.candidateMatched ? "found" : "not found"} ·{" "}
											{item.candidateCheckConfidence ?? 0}%
										</div>
										{item.candidateMatchedName ? (
											<div className="mt-1">Matched: {item.candidateMatchedName}</div>
										) : null}
										{item.candidateEvidence ? (
											<div className="mt-1">{item.candidateEvidence}</div>
										) : null}
									</div>
								) : null}

								{item.specialtyRows.length ? (
									<div className="mt-4 overflow-hidden rounded-md border border-stone-300">
										<button
											type="button"
											className="flex w-full items-center justify-between gap-3 bg-white/70 px-3 py-3 text-left text-sm font-medium"
											onClick={() => onToggleSpecialties(item.id)}
										>
											<span>
												Specialties ({item.specialtyRows.length}) ·{" "}
												{item.specialtyRows.reduce(
													(sum, row) => sum + row.seats,
													0,
												)}{" "}
												seats
											</span>
											<ChevronDown
												className={cn(
													"h-4 w-4 shrink-0 transition-transform",
													expandedSpecialties[item.id] && "rotate-180",
												)}
											/>
										</button>
										{expandedSpecialties[item.id] ? (
											<table className="w-full border-collapse bg-white/70 text-sm">
												<thead className="bg-stone-100 text-left">
													<tr>
														<th className="px-3 py-2 font-medium">Specialty</th>
														<th className="px-3 py-2 font-medium">Frame</th>
														<th className="px-3 py-2 text-right font-medium">
															Seats
														</th>
													</tr>
												</thead>
												<tbody>
													{item.specialtyRows.map((row) => (
														<tr
															key={row.id}
															className={cn(
																"border-t border-stone-200",
																row.isRadiology && "bg-emerald-50",
															)}
														>
															<td className="px-3 py-2">{row.specialty}</td>
															<td className="px-3 py-2 text-stone-600">
																{row.frame ?? "-"}
															</td>
															<td className="px-3 py-2 text-right">
																{row.seats}
															</td>
														</tr>
													))}
												</tbody>
											</table>
										) : null}
									</div>
								) : null}
							</section>
						))}
					</div>

					<aside className="h-fit rounded-md border border-stone-300 bg-white/60 p-4">
						<div className="font-medium">Decision</div>
						<p className="mt-1 text-sm text-stone-600">
							Stored on the main concours record.
						</p>
						<div className="mt-3 flex flex-wrap gap-2">
							{applicationStatuses.map((status) => (
								<DecisionChip
									key={status}
									active={concoursCase.primary.applicationStatus === status}
									label={statusLabel(status)}
								/>
							))}
						</div>
						<p className="mt-4 whitespace-pre-wrap text-sm text-stone-700">
							{concoursCase.primary.adminNotes || "No notes yet."}
						</p>
						{adminToken ? (
							<Button
								className="mt-4 w-full"
								variant="secondary"
								onClick={() => onBeginEdit(concoursCase.primary)}
							>
								<PencilLine className="h-4 w-4" />
								Edit decision
							</Button>
						) : (
							<div className="mt-4 rounded-md border border-stone-200 bg-stone-50 p-3 text-sm text-stone-600">
								Unlock decision access from the header settings.
							</div>
						)}

						{editing === concoursCase.primary.id ? (
							<div className="mt-4 grid gap-3 border-t border-stone-300 pt-4">
								<select
									value={draft.applicationStatus}
									onChange={(event) =>
										onDraftChange((current) => ({
											...current,
											applicationStatus: event.target.value as ApplicationStatus,
										}))
									}
									className="h-10 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-amber-700 focus:ring-2 focus:ring-amber-700/20"
								>
									{applicationStatuses.map((status) => (
										<option key={status} value={status}>
											{statusLabel(status)}
										</option>
									))}
								</select>
								<Textarea
									value={draft.adminNotes}
									onChange={(event) =>
										onDraftChange((current) => ({
											...current,
											adminNotes: event.target.value,
										}))
									}
									placeholder="Private decision notes"
								/>
								<div className="flex gap-2">
									<Button
										disabled={updatePending}
										onClick={() => onSave(concoursCase.primary)}
									>
										Save
									</Button>
									<Button variant="ghost" onClick={onCancelEdit}>
										Cancel
									</Button>
								</div>
							</div>
						) : null}
					</aside>
				</div>
			</div>
		</div>
	);
}

function Stat({ label, value }: { label: string; value: number }) {
	return (
		<div className="rounded-md border border-stone-300 bg-white/60 px-3 py-3">
			<div className="text-2xl font-semibold">{value}</div>
			<div className="text-xs font-medium uppercase tracking-wide text-stone-600">
				{label}
			</div>
		</div>
	);
}

function Info({
	icon,
	label,
	value,
}: {
	icon: React.ReactNode;
	label: string;
	value: string;
}) {
	return (
		<div className="flex gap-2 rounded-md border border-stone-200 bg-white/50 p-3">
			<div className="mt-0.5 text-amber-900">{icon}</div>
			<div>
				<div className="text-xs font-medium uppercase tracking-wide text-stone-500">
					{label}
				</div>
				<div className="mt-1 font-medium text-stone-950">{value}</div>
			</div>
		</div>
	);
}
