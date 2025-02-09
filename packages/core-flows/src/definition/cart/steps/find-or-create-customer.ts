import { ModuleRegistrationName } from "@medusajs/modules-sdk"
import { CustomerDTO, ICustomerModuleService } from "@medusajs/types"
import { validateEmail } from "@medusajs/utils"
import { StepResponse, createStep } from "@medusajs/workflows-sdk"

interface StepInput {
  customerId?: string
  email?: string
}

interface StepOutput {
  customer?: CustomerDTO
  email?: string
}

interface StepCompensateInput {
  customer?: CustomerDTO
  customerWasCreated: boolean
}

export const findOrCreateCustomerStepId = "find-or-create-customer"
export const findOrCreateCustomerStep = createStep(
  findOrCreateCustomerStepId,
  async (data: StepInput, { container }) => {
    const service = container.resolve<ICustomerModuleService>(
      ModuleRegistrationName.CUSTOMER
    )

    const customerData: StepOutput = {}
    let customerWasCreated = false

    if (data.customerId) {
      const customer = await service.retrieve(data.customerId)
      customerData.customer = customer
      customerData.email = customer.email

      return new StepResponse(customerData, {
        customerWasCreated,
      })
    }

    if (data.email) {
      const validatedEmail = validateEmail(data.email)

      let [customer] = await service.list({
        email: validatedEmail,
        has_account: false,
      })

      if (!customer) {
        customer = await service.create({ email: validatedEmail })
        customerWasCreated = true
      }

      customerData.customer = customer
      customerData.email = customer.email
    }

    return new StepResponse(customerData, {
      customer: customerData.customer,
      customerWasCreated,
    })
  },
  async (compData, { container }) => {
    const { customer, customerWasCreated } = compData as StepCompensateInput

    if (!customerWasCreated || !customer?.id) {
      return
    }

    const service = container.resolve<ICustomerModuleService>(
      ModuleRegistrationName.CUSTOMER
    )

    await service.delete(customer.id)
  }
)
