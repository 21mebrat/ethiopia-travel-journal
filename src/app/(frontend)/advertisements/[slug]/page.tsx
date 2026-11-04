import { redirect } from 'next/navigation'

type Props = {
  params: Promise<{
    slug: string
  }>
  searchParams: Promise<{
    locale?: string
  }>
}

export default async function PluralAdvertisementRedirect({ params, searchParams }: Props) {
  const { slug } = await params
  const { locale } = await searchParams
  const localeQuery = locale ? `?locale=${locale}` : ''
  redirect(`/advertisement/${slug}${localeQuery}`)
}
