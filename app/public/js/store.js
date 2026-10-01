// Borrador del diseño en curso (compartido entre editor y vista previa) y guardado en la API.
import { api } from './api.js';

const DRAFT_KEY = 'packlab:draft';

export function getDraft() {
  try { return JSON.parse(sessionStorage.getItem(DRAFT_KEY)); } catch { return null; }
}

export function setDraft(draft) {
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // Imágenes muy pesadas pueden exceder la cuota; se guarda sin ellas.
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ ...draft, data: { ...draft.data, image: null } }));
  }
}

export function clearDraft() {
  sessionStorage.removeItem(DRAFT_KEY);
}

/** Crea o actualiza el diseño en el servidor. Devuelve el diseño guardado. */
export async function saveDesign(draft, thumbnail) {
  const body = { name: draft.name, data: draft.data, thumbnail };
  const saved = draft.designId
    ? await api(`/designs/${draft.designId}`, { method: 'PUT', body })
    : await api('/designs', { method: 'POST', body: { ...body, template_slug: draft.templateSlug } });
  setDraft({ ...draft, designId: saved.id });
  return saved;
}

/** Lee ?design=ID o ?template=slug, o el borrador actual. */
export async function loadWorkingDesign(params = new URLSearchParams(location.search)) {
  const designId = params.get('design');
  const slug = params.get('template');
  const draft = getDraft();

  if (designId) {
    if (draft && String(draft.designId) === designId) {
      return { draft, template: await api(`/templates/${draft.templateSlug}`) };
    }
    const d = await api(`/designs/${designId}`);
    const next = { designId: d.id, templateSlug: d.template_slug, name: d.name, data: d.data };
    setDraft(next);
    return { draft: next, template: await api(`/templates/${d.template_slug}`) };
  }
  if (slug) {
    if (draft && !draft.designId && draft.templateSlug === slug) {
      return { draft, template: await api(`/templates/${slug}`) };
    }
    return { draft: null, template: await api(`/templates/${slug}`) };
  }
  if (draft) return { draft, template: await api(`/templates/${draft.templateSlug}`) };
  return { draft: null, template: null };
}
