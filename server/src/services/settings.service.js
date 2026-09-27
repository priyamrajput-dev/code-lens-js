class SettingsService {
  constructor(githubService, billingService, billingRepository) {
    this.githubService = githubService;
    this.billingService = billingService;
    this.billingRepository = billingRepository;
  }

  async getSettings(userId) {
    const user = await this.billingRepository.findUserById(userId);
    const subscription = await this.billingService.getUserSubscription(userId);
    const usage = await this.billingService.getUsageSummary(userId);
    const githubStatus = await this.githubService.getInstallationStatus(userId);

    return {
      user: {
        id: user?._id || user?.id,
        plan: user?.plan ?? "free",
        subscriptionStatus: user?.subscriptionStatus,
        subscriptionRenewsAt: user?.subscriptionRenewsAt,
      },
      subscription,
      usage,
      githubStatus,
    };
  }
}

export default SettingsService;
