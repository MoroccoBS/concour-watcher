"use client";

import type { inferRouterOutputs } from "@trpc/server";
import {
	AlertTriangle,
	CalendarDays,
	ExternalLink,
	Filter,
	KeyRound,
	ChevronDown,
	MapPin,
	PencilLine,
	RadioTower,
	SearchCheck,
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
	const [editing, setEditing] = useState<string | null>(null);
	const [expandedSpecialties, setExpandedSpecialties] = useState<
		Record<string, boolean>
	>({});
	const [draft, setDraft] = useState<{
		applicationStatus: ApplicationStatus;
		adminNotes: string;
	}>({ applicationStatus: "new", adminNotes: "" });

	const filtered = useMemo(() => {
		return data.filter((item) => {
      if (filter === "all") return true;
      if (filter === "review") return item.processingStatus === "needs_review";
      return (
        item.isRadiologyRelevant ||
        (item.isImportant && item.processingStatus !== "processed")
      );
		});
	}, [data, filter]);

	const stats = useMemo(() => {
    const radiology = data.filter(
      (item) =>
        item.isRadiologyRelevant ||
        (item.isImportant && item.processingStatus !== "processed"),
    );
		return {
			total: data.length,
			radiology: radiology.length,
			review: data.filter((item) => item.processingStatus === "needs_review")
				.length,
			conflicts: data.filter((item) => item.sameDayConflict).length,
			seats: radiology.reduce(
				(sum, item) => sum + (item.radiologySeats ?? 0),
				0,
			),
		};
	}, [data]);

	function beginEdit(item: DocumentItem) {
		setEditing(item.id);
		setDraft({
			applicationStatus: item.applicationStatus,
			adminNotes: item.adminNotes,
		});
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
                ITS concours, read carefully and caught early.
							</h1>
							<p className="mt-5 max-w-2xl text-base leading-7 text-stone-700 sm:text-lg">
                New paramedical PDFs are detected fast, checked by Gemini, and
								organized around deadlines, seats, conflicts, and your own apply
								decisions.
							</p>
						</div>
						<div className="grid grid-cols-2 gap-3 sm:grid-cols-5 lg:w-[520px]">
							<Stat label="Tracked" value={stats.total} />
      <Stat label="ITS focus" value={stats.radiology} />
							<Stat label="Seats" value={stats.seats} />
							<Stat label="Review" value={stats.review} />
							<Stat label="Conflicts" value={stats.conflicts} />
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
						<div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
							<Input
								type="password"
								placeholder="Admin token"
								value={draftToken}
								onChange={(event) => setDraftToken(event.target.value)}
								className="sm:w-56"
							/>
							<Button
								variant="secondary"
								onClick={() => {
									if (draftToken) setAdminToken(draftToken);
									else clearAdminToken();
								}}
							>
								<KeyRound className="h-4 w-4" />
								{adminToken ? "Update admin" : "Unlock"}
							</Button>
						</div>
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
						<div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
							<div className="min-w-0 flex-1">
								<div className="mb-3 flex flex-wrap gap-2">
									<Badge className={statusTone(item.applicationStatus)}>
										{statusLabel(item.applicationStatus)}
									</Badge>
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
									{item.isRadiologyRelevant ? (
										<Badge className="border-emerald-200 bg-emerald-100 text-emerald-900">
											radiology
										</Badge>
									) : null}
									{item.sameDayConflict ? (
										<Badge className="border-orange-200 bg-orange-100 text-orange-900">
											same-day conflict
										</Badge>
									) : null}
								</div>
								<h2 className="font-serif text-2xl leading-snug">
									{displayTitle(item)}
								</h2>
								<div className="mt-4 grid gap-3 text-sm text-stone-700 sm:grid-cols-2 lg:grid-cols-4">
									<Info
										icon={<CalendarDays className="h-4 w-4" />}
										label="Exam"
										value={formatDateTime(item.examDate)}
									/>
									<Info
										icon={<CalendarDays className="h-4 w-4" />}
										label="Deadline"
										value={formatDateTime(item.applicationDeadline)}
									/>
									<Info
										icon={<MapPin className="h-4 w-4" />}
										label="Place"
										value={item.center ?? item.region ?? "Unknown"}
									/>
									<Info
										icon={<RadioTower className="h-4 w-4" />}
										label="Radiology seats"
										value={item.radiologySeats?.toString() ?? "Unknown"}
									/>
								</div>

								{item.specialtyRows.length ? (
									<div className="mt-5 overflow-hidden rounded-md border border-stone-300 bg-white/60">
										<button
											type="button"
											className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left text-sm font-medium"
											onClick={() =>
												setExpandedSpecialties((current) => ({
													...current,
													[item.id]: !current[item.id],
												}))
											}
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

								{item.validationIssues?.length ? (
									<div className="mt-4 rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-950">
										{item.validationIssues.join(" ")}
									</div>
								) : null}
							</div>

							<div className="flex w-full flex-col gap-3 lg:w-72">
								<Button asChild variant="outline">
									<a
										href={item.hasAttachment ? item.pdfUrl : item.sourcePageUrl}
										target="_blank"
										rel="noreferrer"
									>
										<ExternalLink className="h-4 w-4" />
										{item.hasAttachment ? "Open PDF" : "Open source page"}
									</a>
								</Button>
								{adminToken ? (
									<Button variant="secondary" onClick={() => beginEdit(item)}>
										<PencilLine className="h-4 w-4" />
										Edit decision
									</Button>
								) : null}
								<div className="rounded-md border border-stone-300 bg-white/60 p-3 text-sm text-stone-700">
									<div className="font-medium text-stone-950">Notes</div>
									<p className="mt-1 whitespace-pre-wrap">
										{item.adminNotes || "No notes yet."}
									</p>
								</div>
							</div>
						</div>

						{editing === item.id ? (
							<div className="mt-5 grid gap-3 border-t border-stone-300 pt-5">
								<select
									value={draft.applicationStatus}
									onChange={(event) =>
										setDraft((current) => ({
											...current,
											applicationStatus: event.target
												.value as ApplicationStatus,
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
										setDraft((current) => ({
											...current,
											adminNotes: event.target.value,
										}))
									}
									placeholder="Private decision notes"
								/>
								<div className="flex gap-2">
									<Button
										disabled={updateAdmin.isPending}
										onClick={() =>
											updateAdmin.mutate({
												id: item.id,
												...draft,
											})
										}
									>
										Save
									</Button>
									<Button variant="ghost" onClick={() => setEditing(null)}>
										Cancel
									</Button>
								</div>
							</div>
						) : null}
					</article>
				))}
			</section>
		</main>
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
