function canApproveVoucher(userId, voucher) {
  if (!userId || !voucher) return false
  if (voucher.status === "APPROVED") return false
  return voucher.creatorId !== userId
}

function canApproveSrv(userId, srvVoucher) {
  return canApproveVoucher(userId, srvVoucher)
}

function canApproveSiv(userId, sivVoucher) {
  return canApproveVoucher(userId, sivVoucher)
}

function canProvideWriteOffApproval(userRoleNames, expectedRoleName) {
  return Array.isArray(userRoleNames) && userRoleNames.includes(expectedRoleName)
}

function canCompleteWriteOff(authorizations) {
  return Boolean(
    authorizations?.bursarDecision === "APPROVED" &&
      authorizations?.vcDecision === "APPROVED" &&
      authorizations?.bursarApproverId &&
      authorizations?.vcApproverId &&
      authorizations.bursarApproverId !== authorizations.vcApproverId,
  )
}

module.exports = {
  canApproveVoucher,
  canApproveSrv,
  canApproveSiv,
  canProvideWriteOffApproval,
  canCompleteWriteOff,
}
