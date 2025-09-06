import Heading from '@theme/Heading'
import clsx from 'clsx'
import { JSX } from 'react'
import styles from './styles.module.css'

type FeatureItem = {
    title: string
    Svg: React.ComponentType<React.ComponentProps<'svg'>>
    description: JSX.Element
}

const FeatureList: FeatureItem[] = [
    {
        title: 'Easy to Use',
        Svg: require('@site/static/img/undraw_docusaurus_mountain.svg').default,
        description: (
            <>
                Nitro Module CLI was designed to simplify the creation of React
                Native modules, making it easy to get started quickly.
            </>
        ),
    },
    {
        title: 'Streamlined Development',
        Svg: require('@site/static/img/undraw_docusaurus_tree.svg').default,
        description: (
            <>
                Nitro Module CLI lets you focus on developing your modules,
                while it handles the setup and configuration.
            </>
        ),
    },
    {
        title: 'Powered by Nitro Modules',
        Svg: require('@site/static/img/undraw_docusaurus_react.svg').default,
        description: (
            <>
                A framework to build mindblowingly fast native modules with
                type-safe statically compiled JS bindings.
            </>
        ),
    },
]

function Feature({ title, Svg, description }: FeatureItem) {
    return (
        <div className={clsx('col col--4')}>
            <div className="text--center">
                <Svg className={styles.featureSvg} role="img" />
            </div>
            <div className="text--center padding-horiz--md">
                <Heading as="h3">{title}</Heading>
                <p>{description}</p>
            </div>
        </div>
    )
}

export default function HomepageFeatures(): JSX.Element {
    return (
        <section className={styles.features}>
            <div className="container">
                <div className="row">
                    {FeatureList.map((props, idx) => (
                        <Feature key={idx} {...props} />
                    ))}
                </div>
            </div>
        </section>
    )
}
