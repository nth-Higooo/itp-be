import { Column, Entity, OneToMany } from "typeorm";
import { AppBaseEntity } from "./AppBase";
import { Employee } from "./Employee";
export enum CompanyStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
}
enum IndustryType {
  TECHNOLOGY = "Technology",
  FINANCE = "Finance",
  HEALTHCARE = "Healthcare",
  EDUCATION = "Education",
  MANUFACTURING = "Manufacturing",
  RETAIL = "Retail",
  ENERGY = "Energy",
  TRANSPORTATION = "Transportation",
  REAL_ESTATE = "Real Estate",
  TELECOMMUNICATIONS = "Telecommunications",
  HOSPITALITY = "Hospitality",
  ENTERTAINMENT = "Entertainment",
  AGRICULTURE = "Agriculture",
  CONSTRUCTION = "Construction",
  LEGAL = "Legal",
  GOVERNMENT = "Government",
  MEDIA = "Media",
  CONSULTING = "Consulting",
  FOOD_AND_BEVERAGE = "Food and Beverage",
}

@Entity("companies")
export class Company extends AppBaseEntity {
  @Column()
  name: string;

  @Column({ nullable: true })
  email?: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ nullable: true })
  website?: string;

  @Column({ nullable: true })
  address?: string;

  @Column({ nullable: true })
  logo?: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ nullable: true })
  foundedDate?: Date;

  @Column({ nullable: true })
  numberOfEmployees?: number;

  @Column({ type: "enum", enum: IndustryType, nullable: true })
  industry?: IndustryType;

  @Column({ nullable: true })
  revenue?: string;

  @Column({ nullable: true })
  taxCode?: string;

  @Column({ nullable: true })
  businessRegistrationCode?: string;

  @Column({ nullable: true })
  businessRegistrationDate?: Date;

  @Column({ nullable: true })
  businessRegistrationPlace?: string;

  @Column({ nullable: true })
  legalRepresentative?: string;

  @Column({ nullable: true })
  legalRepresentativePosition?: string;

  @Column({ nullable: true })
  legalRepresentativeNationality?: string;

  @Column({ nullable: true })
  legalRepresentativePassport?: string;

  @Column({ nullable: true })
  legalRepresentativeDateOfBirth?: Date;

  @Column({ nullable: true })
  legalRepresentativeAddress?: string;

  @Column({ nullable: true })
  legalRepresentativePhone?: string;

  @Column({ nullable: true })
  legalRepresentativeEmail?: string;

  @Column({ nullable: true })
  bankAccountNumber?: string;

  @Column({ nullable: true })
  bankName?: string;

  @OneToMany(() => Employee, (employee) => employee.corporate)
  employees: Employee[];

  @Column({
    type: "enum",
    enum: CompanyStatus,
    default: CompanyStatus.INACTIVE,
  })
  status: CompanyStatus;
}
