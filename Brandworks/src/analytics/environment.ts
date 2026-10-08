declare const process: {
  readonly env: {
    readonly NEXT_PUBLIC_GA_MEASUREMENT_ID?: string
    readonly NEXT_PUBLIC_CLARITY_PROJECT_ID?: string
    readonly NEXT_PUBLIC_GTM_CONTAINER_ID?: string
    readonly NEXT_PUBLIC_META_PIXEL_ID?: string
    readonly NEXT_PUBLIC_GSC_VERIFICATION?: string
  }
}

export const publicAnalyticsEnvironment = {
  gaMeasurementId: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID,
  clarityProjectId: process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID,
  gtmContainerId: process.env.NEXT_PUBLIC_GTM_CONTAINER_ID,
  metaPixelId: process.env.NEXT_PUBLIC_META_PIXEL_ID,
  gscVerification: process.env.NEXT_PUBLIC_GSC_VERIFICATION,
}
