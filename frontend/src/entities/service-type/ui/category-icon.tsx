import type { ComponentType } from "react"

import { AerospacePartsEquipment } from "./category-icons/aerospace-parts-equipment"
import { AgriculturalProducts } from "./category-icons/agricultural-products"
import { Architecture } from "./category-icons/architecture"
import { ArtworkAndCollectibles } from "./category-icons/artwork-and-collectibles"
import { AutomobileVehicles } from "./category-icons/automobile-vehicles"
import { BulkCargo } from "./category-icons/bulk-cargo"
import { ChemicalsAndPetrochemicals } from "./category-icons/chemicals-and-petrochemicals"
import { ConstructionMaterials } from "./category-icons/construction-materials"
import { ContainerizedCargo } from "./category-icons/containerized-cargo"
import { ElectronicsAndHighTech } from "./category-icons/electronics-and-high-tech"
import { FoodAndBeverage } from "./category-icons/food-and-beverage"
import { FurnitureAndHome } from "./category-icons/furniture-and-home"
import { GeneralCargo } from "./category-icons/general-cargo"
import { HazardousMaterials } from "./category-icons/hazardous-materials"
import { LiquidCargo } from "./category-icons/liquid-cargo"
import { LivestockAndAnimals } from "./category-icons/livestock-and-animals"
import { MineralsAndOres } from "./category-icons/minerals-and-ores"
import { OversizedAndHeavyCargo } from "./category-icons/oversized-and-heavy-cargo"
import { PaperAndPrintingProducts } from "./category-icons/paper-and-printing-products"
import { PerishableGoods } from "./category-icons/perishable-goods"
import { PharmaAndMedicalSupplies } from "./category-icons/pharma-and-medical-supplies"
import { RefrigeratedCargo } from "./category-icons/refrigerated-cargo"
import { RetailGoods } from "./category-icons/retail-goods"
import { SpecializedCargo } from "./category-icons/specialized-cargo"
import { TextilesAndApparel } from "./category-icons/textiles-and-apparel"

const CATEGORY_ICON_COMPONENTS: Record<string, ComponentType> = {
    "aerospace-parts": AerospacePartsEquipment,
    "agricultural-products": AgriculturalProducts,
    architecture: Architecture,
    "artwork-and-collectibles": ArtworkAndCollectibles,
    "automobiles-and-vehicles": AutomobileVehicles,
    "bulk-cargo": BulkCargo,
    "chemicals-and-petrochemicals": ChemicalsAndPetrochemicals,
    "construction-materials": ConstructionMaterials,
    "containerized-cargo": ContainerizedCargo,
    "electronics-and-high-tech-goods": ElectronicsAndHighTech,
    "food-and-beverages": FoodAndBeverage,
    "furniture-and-home-goods": FurnitureAndHome,
    "general-cargo": GeneralCargo,
    "hazardous-materials-hazmat": HazardousMaterials,
    "liquid-cargo": LiquidCargo,
    "livestock-and-animals": LivestockAndAnimals,
    "minerals-and-ores": MineralsAndOres,
    "oversized-and-heavy-cargo": OversizedAndHeavyCargo,
    "paper-and-printing-products": PaperAndPrintingProducts,
    "perishable-goods": PerishableGoods,
    "pharma-medical-supplies": PharmaAndMedicalSupplies,
    "refrigerated-cargo-reefer": RefrigeratedCargo,
    "retail-goods": RetailGoods,
    "specialized-cargo": SpecializedCargo,
    "textiles-and-apparel": TextilesAndApparel,
}

interface CategoryIconProps {
    slug: string
}

export function CategoryIcon({ slug }: CategoryIconProps) {
    const IconComponent = CATEGORY_ICON_COMPONENTS[slug] || GeneralCargo
    return <IconComponent />
}
