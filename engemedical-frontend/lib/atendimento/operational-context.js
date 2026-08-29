const ACTIVE_TICKET_STATUSES = new Set(["EM CHAMADA", "EM ATENDIMENTO"]);

function normalizeOperationalContextValue(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function getTicketOperationalOwner(ticket) {
  return normalizeOperationalContextValue(
    ticket?.profissional || ticket?.atendente,
  );
}

function belongsToOtherOperationalContext(ticket, context) {
  if (!ticket || !ACTIVE_TICKET_STATUSES.has(ticket.status)) {
    return false;
  }

  const storedSala = normalizeOperationalContextValue(ticket.sala);
  const storedProfissional = getTicketOperationalOwner(ticket);
  const requestSala = normalizeOperationalContextValue(context?.sala);
  const requestProfissional = normalizeOperationalContextValue(
    context?.profissional,
  );

  const hasSala = storedSala !== "";
  const hasProfissional = storedProfissional !== "";

  if (!hasSala && !hasProfissional) {
    return false;
  }

  const conflictBySala =
    hasSala && requestSala !== "" && storedSala !== requestSala;
  const conflictByProfissional =
    hasProfissional &&
    requestProfissional !== "" &&
    storedProfissional !== requestProfissional;

  return conflictBySala || conflictByProfissional;
}

module.exports = {
  ACTIVE_TICKET_STATUSES,
  belongsToOtherOperationalContext,
  getTicketOperationalOwner,
  normalizeOperationalContextValue,
};
