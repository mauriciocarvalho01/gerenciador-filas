import './config/module-alias'
import { makeScheduler } from '@/main/factories/domain/use-cases'

import 'reflect-metadata'

void makeScheduler().perform()
