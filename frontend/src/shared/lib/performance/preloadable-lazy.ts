import { type ComponentType, type LazyExoticComponent, lazy } from "react"

type LazyModule = { default: unknown }
type LoadedProps<Component> = Component extends () => unknown
    ? Record<string, never>
    : Component extends (props: infer Props) => unknown
      ? Props
      : Component extends ComponentType<infer Props>
        ? Props
        : never

interface PreloadableLazyComponent<Props> extends LazyExoticComponent<ComponentType<Props>> {
    preload: () => Promise<{ default: ComponentType<Props> }>
}

export function preloadableLazy<Module extends LazyModule>(
    load: () => Promise<Module>
): PreloadableLazyComponent<LoadedProps<Module["default"]>> {
    let loadPromise: Promise<Module> | null = null
    const preload = () => {
        loadPromise ??= load().catch((error: unknown) => {
            loadPromise = null
            throw error
        })
        return loadPromise
    }

    type Props = LoadedProps<Module["default"]>
    const Component = lazy(
        preload as Parameters<typeof lazy>[0]
    ) as unknown as PreloadableLazyComponent<Props>
    Component.preload = preload as unknown as () => Promise<{ default: ComponentType<Props> }>

    return Component
}
